var ROOMS = [
  { id: 'room-non-ac', shortName: 'Non-Aircon Room', name: 'Room 1: Non-Aircon Room', badge: 'Fan / Natural Ventilation • 8 Beds', badgeClass: '' },
  { id: 'room-male', shortName: 'Male Room', name: 'Room 2: Male Room', badge: 'Air-Conditioned • Male Only • 8 Beds', badgeClass: 'male' },
  { id: 'room-female', shortName: 'Female Room', name: 'Room 3: Female Room', badge: 'Air-Conditioned • Female Only • 8 Beds', badgeClass: 'female' }
];
var DECK_NUMBERS = new Array(1, 2, 3, 4);
var activePage = 'overview';

function getBedData() { return JSON.parse(localStorage.getItem('angeles_beds') || '{}'); }
function saveBedData(data) { localStorage.setItem('angeles_beds', JSON.stringify(data)); }

function getRentStatus(endDateStr) {
  if (!endDateStr) return { status: 'vacant', label: 'Available' };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var end = new Date(endDateStr + 'T00:00:00');
  var diffDays = Math.ceil((end - today) / 86400000);
  if (diffDays < 0) return { status: 'expired', label: 'Expired (' + Math.abs(diffDays) + 'd ago)' };
  if (diffDays === 0) return { status: 'expiring', label: 'Expires Today' };
  if (diffDays <= 3) return { status: 'expiring', label: 'Expires in ' + diffDays + 'd' };
  return { status: 'active', label: diffDays + 'd left' };
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  var date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

window.syncToCalendar = function (bedId, roomName, bunkLabel) {
  var occ = getBedData()[bedId];
  if (!occ || !occ.endDate) return;
  var cleanDate = occ.endDate.replace(/-/g, '');
  var title = 'Rent Expiration: ' + occ.guestName + ' (' + roomName + ' - ' + bunkLabel + ')';
  var desc = 'Guest: ' + occ.guestName + ' | Room: ' + roomName + ' (' + bunkLabel + ') | Remarks: ' + (occ.notes || 'None');
  var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:' + cleanDate + '\r\nDTEND;VALUE=DATE:' + cleanDate + '\r\nSUMMARY:' + title + '\r\nDESCRIPTION:' + desc + '\r\nEND:VEVENT\r\nEND:VCALENDAR';
  var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'AngelesInn-' + occ.guestName.replace(/\s+/g, '_') + '-Expiry.ics';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

function getRoomStats(roomId, bedData) {
  var vacant = 0, occupied = 0, expiring = 0;
  DECK_NUMBERS.forEach(function (d) {
    new Array('upper', 'lower').forEach(function (pos) {
      var occ = bedData[roomId + '-b' + d + '-' + pos];
      if (!occ) { vacant++; } else {
        occupied++;
        var st = getRentStatus(occ.endDate).status;
        if (st === 'expired' || st === 'expiring') expiring++;
      }
    });
  });
  return { vacant: vacant, occupied: occupied, expiring: expiring };
}

function renderTabs(bedData) {
  var html = '<button class="room-tab ' + (activePage === 'overview' ? 'active' : '') + '" onclick="switchPage(\'overview\')">All Rooms Overview</button>';
  ROOMS.forEach(function (room) {
    var stats = getRoomStats(room.id, bedData);
    html += '<button class="room-tab ' + (activePage === room.id ? 'active' : '') + '" onclick="switchPage(\'' + room.id + '\')">' + room.shortName + ' <span class="tab-pill">' + stats.vacant + '/8 open</span></button>';
  });
  document.getElementById('room-tabs').innerHTML = html;
}

window.switchPage = function (pageId) { activePage = pageId; window.scrollTo(0, 0); renderApp(); };

function renderOverviewPage(bedData) {
  var tv = 0, to = 0, te = 0;
  var cards = ROOMS.map(function (room) {
    var s = getRoomStats(room.id, bedData);
    tv += s.vacant; to += s.occupied; te += s.expiring;
    return '<div class="overview-room-card"><div><span class="room-badge ' + room.badgeClass + '">' + room.badge + '</span><h2 style="font-size:20px;font-weight:800;margin-top:8px;">' + room.name + '</h2><p style="font-size:13px;color:#52525B;margin-top:6px;">4 Double-Deck Bunks (8 Beds Total)</p><div style="display:flex;gap:14px;margin-top:14px;padding-top:14px;border-top:1px solid #F4F4F5;"><div><strong style="font-size:20px;color:#059669;">' + s.vacant + '</strong><span style="display:block;font-size:11px;color:#71717A;">Available</span></div><div><strong style="font-size:20px;color:#18181B;">' + s.occupied + '</strong><span style="display:block;font-size:11px;color:#71717A;">Occupied</span></div><div><strong style="font-size:20px;color:#D97706;">' + s.expiring + '</strong><span style="display:block;font-size:11px;color:#71717A;">Expiring</span></div></div></div><button class="btn-open-room" onclick="switchPage(\'' + room.id + '\')">Open ' + room.shortName + ' Page →</button></div>';
  }).join('');
  return '<section class="stats-grid"><div class="stat-card"><div class="stat-label">Total Capacity</div><div class="stat-value">24 Beds</div></div><div class="stat-card green"><div class="stat-label">Total Available</div><div class="stat-value">' + tv + ' Open</div></div><div class="stat-card"><div class="stat-label">Total Occupied</div><div class="stat-value">' + to + ' Active</div></div><div class="stat-card amber"><div class="stat-label">Expiring / Overdue</div><div class="stat-value">' + te + ' Alerts</div></div></section><h2 style="font-size:16px;font-weight:700;color:#3F3F46;">Select a Room to View Double-Deck Bunks</h2><div class="overview-grid">' + cards + '</div>';
}

function renderBedCard(room, d, pos, bedData) {
  var bedId = room.id + '-b' + d + '-' + pos.toLowerCase();
  var label = 'Bunkbed ' + d + ' ' + pos;
  var occ = bedData[bedId];
  var info = occ ? getRentStatus(occ.endDate) : { status: 'vacant', label: 'Available' };
  if (!occ) {
    return '<div class="bed-card vacant"><div class="bed-top-row"><span class="bed-title">' + label + '</span><span class="status-pill">Available</span></div><p style="font-size:12px;color:#065F46;margin-bottom:10px;">Ready for new tenant</p><div class="bed-actions"><button class="btn-bed assign" onclick="openBedModal(\'' + bedId + '\', \'' + room.name + '\', \'' + label + '\')">+ Assign Guest</button></div></div>';
  }
  var cls = info.status === 'expired' ? 'expired' : (info.status === 'expiring' ? 'expiring' : '');
  return '<div class="bed-card ' + cls + '"><div class="bed-top-row"><span class="bed-title">' + label + '</span><span class="status-pill">' + info.label + '</span></div><div class="bed-details"><div class="bed-row"><span class="bed-key">Name:</span><span class="bed-val">' + occ.guestName + '</span></div><div class="bed-row"><span class="bed-key">Expiration:</span><span class="bed-val">' + formatDateDisplay(occ.endDate) + '</span></div><div class="bed-row"><span class="bed-key">Remarks:</span><span class="bed-val remarks">' + (occ.notes || 'None') + '</span></div></div><div class="bed-actions"><button class="btn-bed" onclick="openBedModal(\'' + bedId + '\', \'' + room.name + '\', \'' + label + '\')">Edit / Clear</button><button class="btn-bed cal" onclick="syncToCalendar(\'' + bedId + '\', \'' + room.shortName + '\', \'' + label + '\')">📅 Sync Calendar</button></div></div>';
}

function renderSingleRoomPage(room, bedData) {
  var stats = getRoomStats(room.id, bedData);
  var decks = DECK_NUMBERS.map(function (d) {
    return '<div class="bunk-frame"><div class="bunk-frame-header"><span class="bunk-frame-label">Double Deck #' + d + '</span><span style="font-size:11px;color:#71717A;font-weight:600;">Upper over Lower</span></div><div class="bunk-structure"><div class="bunk-ladder"><div class="ladder-rung"></div><div class="ladder-rung"></div><div class="ladder-rung"></div><div class="ladder-rung"></div><div class="ladder-rung"></div></div><div class="bunk-tiers">' + renderBedCard(room, d, 'Upper', bedData) + '<div class="bunk-divider"></div>' + renderBedCard(room, d, 'Lower', bedData) + '</div></div></div>';
  }).join('');
  return '<div class="page-header"><div><span class="room-badge ' + room.badgeClass + '">' + room.badge + '</span><h1 class="page-title">' + room.name + '</h1></div><div style="text-align:right;"><strong style="font-size:22px;color:#059669;">' + stats.vacant + '/8</strong><span style="display:block;font-size:11px;color:#71717A;font-weight:700;">AVAILABLE</span></div></div><div class="decks-grid">' + decks + '</div>';
}

function renderApp() {
  var bedData = getBedData();
  renderTabs(bedData);
  var container = document.getElementById('app-content');
  if (activePage === 'overview') {
    container.innerHTML = renderOverviewPage(bedData);
  } else {
    var r = ROOMS.find(function (item) { return item.id === activePage; });
    container.innerHTML = renderSingleRoomPage(r, bedData);
  }
}

var modal = document.getElementById('bunk-modal');
var bunkForm = document.getElementById('bunk-form');
var vacateBtn = document.getElementById('vacate-btn');

window.openBedModal = function (bedId, roomName, bunkTitle) {
  var existing = getBedData()[bedId];
  document.getElementById('modal-bed-id').value = bedId;
  document.getElementById('modal-room-label').textContent = roomName;
  document.getElementById('modal-bunk-title').textContent = bunkTitle;
  if (existing) {
    document.getElementById('guest-name').value = existing.guestName;
    document.getElementById('start-date').value = existing.startDate || '';
    document.getElementById('end-date').value = existing.endDate;
    document.getElementById('guest-notes').value = existing.notes || '';
    vacateBtn.style.display = 'block';
  } else {
    bunkForm.reset();
    document.getElementById('modal-bed-id').value = bedId;
    document.getElementById('start-date').value = new Date().toISOString().slice(0, 10);
    vacateBtn.style.display = 'none';
  }
  modal.classList.add('open');
};

document.getElementById('close-modal').addEventListener('click', function () { modal.classList.remove('open'); });
