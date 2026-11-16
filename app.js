function renderApp() {
  var bedData = typeof getBedData === 'function' ? getBedData() : {};
  if (!bedData || typeof bedData !== 'object' || Array.isArray(bedData)) {
    bedData = {};
  }

  renderTabs(bedData);
  var container = document.getElementById('app-content');
  if (!container) return;

  if (activePage === 'overview') {
    container.innerHTML = renderOverviewPage(bedData);
    return;
  }

  if (!Array.isArray(ROOMS)) {
    container.innerHTML = renderOverviewPage(bedData);
    return;
  }

  var r = ROOMS.find(function (item) { return item.id === activePage; });
  if (!r) {
    activePage = 'overview';
    container.innerHTML = renderOverviewPage(bedData);
    return;
  }

  container.innerHTML = renderSingleRoomPage(r, bedData);
}

var modal = document.getElementById('bunk-modal');
var bunkForm = document.getElementById('bunk-form');
var vacateBtn = document.getElementById('vacate-btn');

function safeGetBedData() {
  var bedData = typeof getBedData === 'function' ? getBedData() : {};
  if (!bedData || typeof bedData !== 'object' || Array.isArray(bedData)) {
    return {};
  }
  return bedData;
}

window.openBedModal = function (bedId, roomName, bunkTitle) {
  if (!modal || !bunkForm || !vacateBtn) return;

  var bedData = safeGetBedData();
  var existing = bedData[bedId] || null;

  document.getElementById('modal-bed-id').value = bedId;
  document.getElementById('modal-room-label').textContent = roomName || 'Room';
  document.getElementById('modal-bunk-title').textContent = bunkTitle || 'Bed';

  if (existing) {
    document.getElementById('guest-name').value = existing.guestName || '';
    document.getElementById('start-date').value = existing.startDate || '';
    document.getElementById('end-date').value = existing.endDate || '';
    document.getElementById('guest-notes').value = existing.notes || '';
    vacateBtn.style.display = 'block';
  } else {
    bunkForm.reset();
    document.getElementById('modal-bed-id').value = bedId;
    document.getElementById('start-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('end-date').value = '';
    vacateBtn.style.display = 'none';
  }

  modal.classList.add('open');
};

document.getElementById('close-modal').addEventListener('click', function () { modal.classList.remove('open'); });

bunkForm.addEventListener('submit', function (e) {
  e.preventDefault();

  var bedId = document.getElementById('modal-bed-id').value;
  if (!bedId) return;

  var guestName = document.getElementById('guest-name').value.trim();
  var startDate = document.getElementById('start-date').value;
  var endDate = document.getElementById('end-date').value;

  if (!guestName || !startDate || !endDate) {
    return;
  }

  var bedData = safeGetBedData();
  bedData[bedId] = {
    guestName: guestName,
    startDate: startDate,
    endDate: endDate,
    notes: document.getElementById('guest-notes').value.trim()
  };

  if (typeof saveBedData === 'function') {
    saveBedData(bedData);
  } else {
    sessionStorage.setItem('angeles_bed_data', JSON.stringify(bedData));
  }

  modal.classList.remove('open');
  renderApp();
});

vacateBtn.addEventListener('click', function () {
  var bedId = document.getElementById('modal-bed-id').value;
  if (!bedId) return;

  var bedData = safeGetBedData();
  delete bedData[bedId];

  if (typeof saveBedData === 'function') {
    saveBedData(bedData);
  } else {
    sessionStorage.setItem('angeles_bed_data', JSON.stringify(bedData));
  }

  modal.classList.remove('open');
  renderApp();
});

document.getElementById('logout-btn').addEventListener('click', function () {
  sessionStorage.removeItem('angeles_owner');
  window.location.replace('login.html');
});

renderApp();
