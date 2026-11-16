/* Angeles Inn bed-space tracker: three rooms, four bunk beds (8 beds) per room. */
var ROOMS = [
  { id: 'male-aircon', name: 'Male Aircon Room', badge: 'MALE', badgeClass: 'male', bunkCount: 4 },
  { id: 'female-aircon', name: 'Female Aircon Room', badge: 'FEMALE', badgeClass: 'female', bunkCount: 4 },
  { id: 'non-aircon', name: 'Non-aircon Room', badge: 'NON-AIRCON', badgeClass: '', bunkCount: 4 }
];

var BED_STORAGE_KEY = 'angeles_bed_data';
var activePage = 'overview';

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function getBedData() {
  try {
    var saved = localStorage.getItem(BED_STORAGE_KEY);
    var parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Unable to read saved bed data:', error);
    return {};
  }
}

function saveBedData(data) {
  try {
    localStorage.setItem(BED_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Unable to save bed data:', error);
    alert('Could not save your changes. Check that browser storage is available.');
    return false;
  }
}

function getRoomBeds(room, bedData) {
  var beds = [];
  for (var bunk = 1; bunk <= room.bunkCount; bunk++) {
    ['upper', 'lower'].forEach(function (level) {
      var id = room.id + '-bunk-' + bunk + '-' + level;
      beds.push({ id: id, bunk: bunk, level: level, guest: bedData[id] || null });
    });
  }
  return beds;
}

function formatDate(value) {
  if (!value) return '—';
  var date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? escapeHTML(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getBedStatus(guest) {
  if (!guest) return 'vacant';
  if (!guest.endDate) return 'occupied';
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var end = new Date(guest.endDate + 'T00:00:00');
  var daysLeft = Math.ceil((end - today) / 86400000);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 3) return 'expiring';
  return 'occupied';
}

function renderTabs(bedData) {
  var tabs = document.getElementById('room-tabs');
  if (!tabs) return;

  var allTabs = [{ id: 'overview', name: 'Overview', beds: [] }].concat(ROOMS.map(function (room) {
    return { id: room.id, name: room.name, beds: getRoomBeds(room, bedData) };
  }));

  tabs.innerHTML = allTabs.map(function (tab) {
    var occupied = tab.beds.filter(function (bed) { return !!bed.guest; }).length;
    var pill = tab.id === 'overview' ? '' : '<span class="tab-pill">' + occupied + '/' + tab.beds.length + '</span>';
    return '<button type="button" class="room-tab' + (activePage === tab.id ? ' active' : '') + '" data-page="' + escapeHTML(tab.id) + '">' + escapeHTML(tab.name) + pill + '</button>';
  }).join('');
}

function renderBedCard(bed, room) {
  var guest = bed.guest;
  var status = getBedStatus(guest);
  var title = 'Bunk ' + bed.bunk + ' ' + (bed.level === 'upper' ? 'Upper' : 'Lower');

  var details = guest
    ? '<div class="bed-row"><span class="bed-key">GUEST</span><span class="bed-val">' + escapeHTML(guest.guestName) + '</span></div>' +
      '<div class="bed-row"><span class="bed-key">CHECK-IN</span><span class="bed-val">' + formatDate(guest.startDate) + '</span></div>' +
      '<div class="bed-row"><span class="bed-key">CHECK-OUT</span><span class="bed-val">' + formatDate(guest.endDate) + '</span></div>' +
      (guest.notes ? '<div class="bed-row"><span class="bed-key">REMARKS</span><span class="bed-val remarks">' + escapeHTML(guest.notes) + '</span></div>' : '')
    : '<div class="bed-row"><span class="bed-key">STATUS</span><span class="bed-val">Available</span></div>';

  var statusLabel = status === 'vacant' ? 'Vacant' : status === 'expired' ? 'Check-out overdue' : status === 'expiring' ? 'Checking out soon' : 'Occupied';

  return '<article class="bed-card ' + status + '">' +
    '<div class="bed-top-row"><span class="bed-title">' + title + '</span><span class="status-pill">' + statusLabel + '</span></div>' +
    '<div class="bed-details">' + details + '</div>' +
    '<div class="bed-actions"><button type="button" class="btn-bed ' + (guest ? '' : 'assign') + '" data-action="edit-bed" data-bed-id="' + escapeHTML(bed.id) + '" data-room="' + escapeHTML(room.name) + '" data-title="' + escapeHTML(title) + '">' + (guest ? 'Edit Guest' : 'Assign Guest') + '</button></div>' +
    '</article>';
}

function renderRoomPage(room, bedData) {
  var beds = getRoomBeds(room, bedData);
  var occupied = beds.filter(function (bed) { return !!bed.guest; }).length;
  var bunks = '';

  for (var i = 1; i <= room.bunkCount; i++) {
    var upper = beds.find(function (bed) { return bed.bunk === i && bed.level === 'upper'; });
    var lower = beds.find(function (bed) { return bed.bunk === i && bed.level === 'lower'; });
    bunks += '<section class="bunk-frame"><div class="bunk-frame-header"><span class="bunk-frame-label">Double-deck bunk ' + i + '</span><span>' + (Number(!!upper.guest) + Number(!!lower.guest)) + '/2 occupied</span></div><div class="bunk-structure"><div class="bunk-ladder"><span class="ladder-rung"></span><span class="ladder-rung"></span><span class="ladder-rung"></span></div><div class="bunk-tiers">' + renderBedCard(upper, room) + '<div class="bunk-divider"></div>' + renderBedCard(lower, room) + '</div></div></section>';
  }

  return '<div class="page-header"><div><span class="room-badge ' + escapeHTML(room.badgeClass) + '">' + escapeHTML(room.badge) + '</span><h1 class="page-title">' + escapeHTML(room.name) + '</h1></div><div style="text-align:right;"><strong>' + occupied + ' / 8</strong><div>beds occupied</div></div></div><div class="decks-grid">' + bunks + '</div>';
}

function renderOverviewPage(bedData) {
  var totalOccupied = 0;
  var roomCards = ROOMS.map(function (room) {
    var beds = getRoomBeds(room, bedData);
    var occupied = beds.filter(function (bed) { return !!bed.guest; }).length;
    totalOccupied += occupied;
    return '<article class="overview-room-card"><div><span class="room-badge ' + escapeHTML(room.badgeClass) + '">' + escapeHTML(room.badge) + '</span><h2 class="page-title">' + escapeHTML(room.name) + '</h2><p>' + occupied + ' of 8 beds occupied · ' + (8 - occupied) + ' available</p></div><button type="button" class="btn-open-room" data-page="' + escapeHTML(room.id) + '">Manage room</button></article>';
  }).join('');

  return '<h1 class="page-title">Room Overview</h1><div class="stats-grid"><div class="stat-card"><div class="stat-label">Total capacity</div><div class="stat-value">24</div></div><div class="stat-card"><div class="stat-label">Guests in-house</div><div class="stat-value">' + totalOccupied + '</div></div><div class="stat-card green"><div class="stat-label">Available beds</div><div class="stat-value">' + (24 - totalOccupied) + '</div></div></div><div class="overview-grid">' + roomCards + '</div>';
}

function renderApp() {
  var bedData = getBedData();
  var container = document.getElementById('app-content');
  if (!container) return;

  if (activePage !== 'overview' && !ROOMS.some(function (room) { return room.id === activePage; })) {
    activePage = 'overview';
  }

  renderTabs(bedData);

  if (activePage === 'overview') {
    container.innerHTML = renderOverviewPage(bedData);
  } else {
    var room = ROOMS.find(function (item) { return item.id === activePage; });
    if (!room) {
      activePage = 'overview';
      container.innerHTML = renderOverviewPage(bedData);
      return;
    }
    container.innerHTML = renderRoomPage(room, bedData);
  }
}

var modal = document.getElementById('bunk-modal');
var bunkForm = document.getElementById('bunk-form');
var vacateBtn = document.getElementById('vacate-btn');

function closeBedModal() {
  if (modal) modal.classList.remove('open');
}

function openBedModal(bedId, roomName, bunkTitle) {
  if (!modal || !bunkForm) return;

  var bedData = getBedData();
  var guest = bedData[bedId];

  document.getElementById('modal-bed-id').value = bedId;
  document.getElementById('modal-room-label').textContent = roomName;
  document.getElementById('modal-bunk-title').textContent = bunkTitle;
  document.getElementById('guest-name').value = guest ? guest.guestName || '' : '';
  document.getElementById('start-date').value = guest ? guest.startDate || '' : new Date().toISOString().slice(0, 10);
  document.getElementById('end-date').value = guest ? guest.endDate || '' : '';
  document.getElementById('guest-notes').value = guest ? guest.notes || '' : '';
  if (vacateBtn) vacateBtn.style.display = guest ? 'block' : 'none';

  modal.classList.add('open');
}

window.openBedModal = openBedModal;

document.getElementById('room-tabs').addEventListener('click', function (event) {
  var button = event.target.closest('[data-page]');
  if (!button) return;
  activePage = button.getAttribute('data-page');
  renderApp();
});

document.getElementById('app-content').addEventListener('click', function (event) {
  var editButton = event.target.closest('[data-action="edit-bed"]');
  if (editButton) {
    openBedModal(editButton.getAttribute('data-bed-id'), editButton.getAttribute('data-room'), editButton.getAttribute('data-title'));
    return;
  }

  var roomButton = event.target.closest('[data-page]');
  if (roomButton) {
    activePage = roomButton.getAttribute('data-page');
    renderApp();
  }
});

document.getElementById('close-modal').addEventListener('click', closeBedModal);

if (modal) {
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeBedModal();
  });
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeBedModal();
});

if (document.getElementById('end-date')) {
  document.getElementById('end-date').addEventListener('change', function () {
    var startDate = document.getElementById('start-date').value;
    if (startDate) document.getElementById('end-date').min = startDate;
  });
}

if (bunkForm) {
  bunkForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var bedId = document.getElementById('modal-bed-id').value;
    var guestName = document.getElementById('guest-name').value.trim();
    var startDate = document.getElementById('start-date').value;
    var endDate = document.getElementById('end-date').value;

    if (!bedId || !guestName || !startDate || !endDate) return;
    if (endDate < startDate) {
      alert('Check-out date must be on or after the check-in date.');
      return;
    }

    var bedData = getBedData();
    bedData[bedId] = {
      guestName: guestName,
      startDate: startDate,
      endDate: endDate,
      notes: document.getElementById('guest-notes').value.trim()
    };

    if (saveBedData(bedData)) {
      closeBedModal();
      renderApp();
    }
  });
}

if (vacateBtn) {
  vacateBtn.addEventListener('click', function () {
    var bedId = document.getElementById('modal-bed-id').value;
    if (!bedId) return;

    var bedData = getBedData();
    delete bedData[bedId];

    if (saveBedData(bedData)) {
      closeBedModal();
      renderApp();
    }
  });
}

document.getElementById('logout-btn').addEventListener('click', function () {
  sessionStorage.removeItem('angeles_owner');
  window.location.replace('login.html');
});

renderApp();
