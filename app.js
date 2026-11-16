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
bunkForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var bedId = document.getElementById('modal-bed-id').value;
  var bedData = getBedData();
  bedData[bedId] = {
    guestName: document.getElementById('guest-name').value.trim(),
    startDate: document.getElementById('start-date').value,
    endDate: document.getElementById('end-date').value,
    notes: document.getElementById('guest-notes').value.trim()
  };
  saveBedData(bedData);
  modal.classList.remove('open');
  renderApp();
});
vacateBtn.addEventListener('click', function () {
  var bedId = document.getElementById('modal-bed-id').value;
  var bedData = getBedData();
  delete bedData[bedId];
  saveBedData(bedData);
  modal.classList.remove('open');
  renderApp();
});
document.getElementById('logout-btn').addEventListener('click', function () {
  sessionStorage.removeItem('angeles_owner');
  window.location.replace('login.html');
});

renderApp();
