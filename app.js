var ROOMS = [
  { id: 'male-aircon', name: 'Male Aircon Room', badge: 'MALE', badgeClass: 'male', bunkCount: 4 },
  { id: 'female-aircon', name: 'Female Aircon Room', badge: 'FEMALE', badgeClass: 'female', bunkCount: 4 },
  { id: 'non-aircon', name: 'Non-aircon Room', badge: 'NON-AIRCON', badgeClass: '', bunkCount: 4 }
];

var activePage = 'overview';

var firebaseApp;
var firebaseAuth;
var firebaseDb;

function initFirebase() {
  const firebaseConfig = {
  apiKey: "AIzaSyAt9RTexlZSOzJM5pmtTNvKgoU51b0SemQ",
  authDomain: "angeles-transient-inn.firebaseapp.com",
  projectId: "angeles-transient-inn",
  storageBucket: "angeles-transient-inn.firebasestorage.app",
  messagingSenderId: "8173451713",
  appId: "1:8173451713:web:b03e7ace87dc2626aa9740",
  measurementId: "G-0WTP5Z3EPR"
};

  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
}

async function getCurrentOwnerUid() {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.uid;
}

function getBedAssignmentsPath() {
  return `users/${firebaseAuth.currentUser.uid}/bed_assignments`;
}

async function loadBedData() {
  if (!firebaseAuth.currentUser) return {};
  const q = collection(firebaseDb, getBedAssignmentsPath());
  const snapshot = await getDocs(q);
  const result = {};
  snapshot.forEach((doc) => {
    result[doc.id] = doc.data();
  });
  return result;
}

async function saveBedData(data) {
  if (!firebaseAuth.currentUser) return;
  const path = getBedAssignmentsPath();
  const promises = [];

  Object.keys(data).forEach((bedId) => {
    if (data[bedId] && data[bedId].guestName) {
      const ref = doc(firebaseDb, path, bedId);
      promises.push(setDoc(ref, {
        bedId: bedId,
        roomId: bedId.split('-bunk-')[0],
        guestName: data[bedId].guestName,
        checkIn: data[bedId].startDate,
        checkOut: data[bedId].endDate,
        remarks: data[bedId].notes || ''
      }));
    } else {
      const ref = doc(firebaseDb, path, bedId);
      promises.push(deleteDoc(ref));
    }
  });

  await Promise.all(promises);
}

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char];
  });
}

function getBedStatus(guest) {
  if (!guest) return 'vacant';
  if (!guest.checkOut) return 'occupied';

  const today = new Date();
  today.setHours(0,0,0,0);

  const end = new Date(guest.checkOut + 'T00:00:00');
  const daysLeft = Math.ceil((end - today) / 86400000);

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 3) return 'expiring';
  return 'occupied';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function renderTabs(bedData) {
  const tabs = document.getElementById('room-tabs');
  if (!tabs) return;

  const allTabs = [{ id: 'overview', name: 'Overview' }].concat(
    ROOMS.map((room) => {
      const beds = getRoomBeds(room, bedData);
      return { id: room.id, name: room.name, beds };
    })
  );

  tabs.innerHTML = allTabs.map((tab) => {
    const occupied = tab.beds ? tab.beds.filter((bed) => !!bed.guest).length : 0;
    const pill = tab.id === 'overview' ? '' : `<span class="tab-pill">${occupied}/${tab.beds.length}</span>`;
    return `<button type="button" class="room-tab${activePage === tab.id ? ' active' : ''}" data-page="${escapeHTML(tab.id)}">${escapeHTML(tab.name)}${pill}</button>`;
  }).join('');
}

function getRoomBeds(room, bedData) {
  const beds = [];
  for (let bunk = 1; bunk <= room.bunkCount; bunk++) {
    ['upper', 'lower'].forEach((level) => {
      const id = room.id + '-bunk-' + bunk + '-' + level;
      beds.push({ id, bunk, level, guest: bedData[id] || null });
    });
  }
  return beds;
}

function renderBedCard(bed, room) {
  const guest = bed.guest;
  const status = getBedStatus(guest);
  const title = 'Bunk ' + bed.bunk + ' ' + (bed.level === 'upper' ? 'Upper' : 'Lower');

  const details = guest
    ? `
      <div class="bed-row"><span class="bed-key">GUEST</span><span class="bed-val">${escapeHTML(guest.guestName)}</span></div>
      <div class="bed-row"><span class="bed-key">CHECK-IN</span><span class="bed-val">${formatDate(guest.checkIn)}</span></div>
      <div class="bed-row"><span class="bed-key">CHECK-OUT</span><span class="bed-val">${formatDate(guest.checkOut)}</span></div>
      ${guest.remarks ? `<div class="bed-row"><span class="bed-key">REMARKS</span><span class="bed-val remarks">${escapeHTML(guest.remarks)}</span></div>` : ''}
    `
    : `<div class="bed-row"><span class="bed-key">STATUS</span><span class="bed-val">Available</span></div>`;

  const statusLabel = status === 'vacant' ? 'Vacant' : status === 'expired' ? 'Check-out overdue' : status === 'expiring' ? 'Checking out soon' : 'Occupied';

  return `
    <article class="bed-card ${status}">
      <div class="bed-top-row">
        <span class="bed-title">${title}</span>
        <span class="status-pill">${statusLabel}</span>
      </div>
      <div class="bed-details">${details}</div>
      <div class="bed-actions">
        <button type="button" class="btn-bed ${guest ? '' : 'assign'}" data-action="edit-bed" data-bed-id="${escapeHTML(bed.id)}" data-room="${escapeHTML(room.name)}" data-title="${escapeHTML(title)}">
          ${guest ? 'Edit Guest' : 'Assign Guest'}
        </button>
      </div>
    </article>
  `;
}

function renderRoomPage(room, bedData) {
  const beds = getRoomBeds(room, bedData);
  const occupied = beds.filter((bed) => !!bed.guest).length;

  let bunks = '';
  for (let i = 1; i <= room.bunkCount; i++) {
    const upper = beds.find((bed) => bed.bunk === i && bed.level === 'upper');
    const lower = beds.find((bed) => bed.bunk === i && bed.level === 'lower');

    bunks += `
      <section class="bunk-frame">
        <div class="bunk-frame-header">
          <span class="bunk-frame-label">Double-deck bunk ${i}</span>
          <span>${Number(!!upper.guest) + Number(!!lower.guest)}/2 occupied</span>
        </div>
        <div class="bunk-structure">
          <div class="bunk-ladder">
            <span class="ladder-rung"></span>
            <span class="ladder-rung"></span>
            <span class="ladder-rung"></span>
          </div>
          <div class="bunk-tiers">
            ${renderBedCard(upper, room)}
            <div class="bunk-divider"></div>
            ${renderBedCard(lower, room)}
          </div>
        </div>
      </section>
    `;
  }

  return `
    <div class="page-header">
      <div>
        <span class="room-badge ${escapeHTML(room.badgeClass)}">${escapeHTML(room.badge)}</span>
        <h1 class="page-title">${escapeHTML(room.name)}</h1>
      </div>
      <div style="text-align:right;">
        <strong>${occupied} / 8</strong>
        <div>beds occupied</div>
      </div>
    </div>
    <div class="decks-grid">${bunks}</div>
  `;
}

function renderOverviewPage(bedData) {
  let totalOccupied = 0;
  const roomCards = ROOMS.map((room) => {
    const beds = getRoomBeds(room, bedData);
    const occupied = beds.filter((bed) => !!bed.guest).length;
    totalOccupied += occupied;

    return `
      <article class="overview-room-card">
        <div>
          <span class="room-badge ${escapeHTML(room.badgeClass)}">${escapeHTML(room.badge)}</span>
          <h2 class="page-title">${escapeHTML(room.name)}</h2>
          <p>${occupied} of 8 beds occupied · ${8 - occupied} available</p>
        </div>
        <button type="button" class="btn-open-room" data-page="${escapeHTML(room.id)}">Manage room</button>
      </article>
    `;
  }).join('');

  return `
    <h1 class="page-title">Room Overview</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total capacity</div><div class="stat-value">24</div></div>
      <div class="stat-card"><div class="stat-label">Guests in-house</div><div class="stat-value">${totalOccupied}</div></div>
      <div class="stat-card green"><div class="stat-label">Available beds</div><div class="stat-value">${24 - totalOccupied}</div></div>
    </div>
    <div class="overview-grid">${roomCards}</div>
  `;
}

async function renderApp() {
  const container = document.getElementById('app-content');
  if (!container) return;

  container.textContent = 'Loading rooms…';

  try {
    const bedData = await loadBedData();
    window.__currentBedData = bedData;

    renderTabs(bedData);

    if (activePage === 'overview') {
      container.innerHTML = renderOverviewPage(bedData);
    } else {
      const room = ROOMS.find((item) => item.id === activePage);

      if (!room) {
        activePage = 'overview';
        container.innerHTML = renderOverviewPage(bedData);
      } else {
        container.innerHTML = renderRoomPage(room, bedData);
      }
    }
  } catch (error) {
    console.error('Could not load the app:', error);
    container.textContent =
      `Could not load room data: ${error.code || error.message || 'Unknown error'}`;
  }
}

function closeBedModal() {
  const modal = document.getElementById('bunk-modal');
  if (modal) modal.classList.remove('open');
}

function openBedModal(bedId, roomName, bunkTitle) {
  const modal = document.getElementById('bunk-modal');
  const bunkForm = document.getElementById('bunk-form');
  const vacateBtn = document.getElementById('vacate-btn');

  if (!modal || !bunkForm) return;

  const guest = getBedDataMap()[bedId];

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

function getBedDataMap() {
  return window.__currentBedData || {};
}

window.openBedModal = openBedModal;

document.getElementById('room-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button) return;

  activePage = button.getAttribute('data-page');
  renderApp();
});

document.getElementById('app-content').addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-action="edit-bed"]');
  if (editButton) {
    openBedModal(editButton.getAttribute('data-bed-id'), editButton.getAttribute('data-room'), editButton.getAttribute('data-title'));
    return;
  }

  const roomButton = event.target.closest('[data-page]');
  if (roomButton) {
    activePage = roomButton.getAttribute('data-page');
    renderApp();
  }
});

document.getElementById('close-modal').addEventListener('click', closeBedModal);

const modal = document.getElementById('bunk-modal');
if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeBedModal();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeBedModal();
});

const endDateInput = document.getElementById('end-date');
if (endDateInput) {
  endDateInput.addEventListener('change', () => {
    const startDate = document.getElementById('start-date').value;
    if (startDate) endDateInput.min = startDate;
  });
}

const bunkForm = document.getElementById('bunk-form');
if (bunkForm) {
  bunkForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const bedId = document.getElementById('modal-bed-id').value;
    const guestName = document.getElementById('guest-name').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!bedId || !guestName || !startDate || !endDate) return;
    if (endDate < startDate) {
      alert('Check-out date must be on or after the check-in date.');
      return;
    }

    const data = await loadBedData();
    data[bedId] = {
      guestName,
      startDate,
      endDate,
      notes: document.getElementById('guest-notes').value.trim()
    };

    await saveBedData(data);
    closeBedModal();
    renderApp();
  });
}

const vacateBtn = document.getElementById('vacate-btn');
if (vacateBtn) {
  vacateBtn.addEventListener('click', async () => {
    const bedId = document.getElementById('modal-bed-id').value;
    if (!bedId) return;

    const data = await loadBedData();
    delete data[bedId];
    await saveBedData(data);
    closeBedModal();
    renderApp();
  });
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(firebaseAuth);
  window.location.replace('login.html');
});

initFirebase();

onAuthStateChanged(firebaseAuth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  window.__currentBedData = await loadBedData();
  renderApp();
});
