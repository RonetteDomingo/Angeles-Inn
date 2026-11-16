// Owner Credentials
const OWNER_ACCOUNT = {
  email: 'owner@angelesinn.ph',
  password: 'angeles2026',
  name: 'Angeles Inn Owner'
};

// 3 Rooms Configuration (Each has 4 Double-Deck Bunks = 8 Beds per room)
const ROOMS = [
  {
    id: 'room-non-ac',
    name: 'Room 1: Non-Aircon',
    badge: 'Fan / Natural Ventilation',
    badgeColor: 'bg-zinc-100 text-zinc-700',
    icon: 'wind'
  },
  {
    id: 'room-male',
    name: 'Room 2: Male Room',
    badge: 'Air-Conditioned • Male Only',
    badgeColor: 'bg-blue-50 text-blue-700',
    icon: 'snowflake'
  },
  {
    id: 'room-female',
    name: 'Room 3: Female Room',
    badge: 'Air-Conditioned • Female Only',
    badgeColor: 'bg-rose-50 text-rose-700',
    icon: 'snowflake'
  }
];

const BUNK_SLOTS = [
  { deck: 1, pos: 'Upper' }, { deck: 1, pos: 'Lower' },
  { deck: 2, pos: 'Upper' }, { deck: 2, pos: 'Lower' },
  { deck: 3, pos: 'Upper' }, { deck: 3, pos: 'Lower' },
  { deck: 4, pos: 'Upper' }, { deck: 4, pos: 'Lower' }
];

// 1. Login Page Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
  if (sessionStorage.getItem('angeles_owner')) {
    window.location.replace('index.html');
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (email === OWNER_ACCOUNT.email && password === OWNER_ACCOUNT.password) {
      sessionStorage.setItem('angeles_owner', JSON.stringify(OWNER_ACCOUNT));
      window.location.href = 'index.html';
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  });
}

// 2. Owner Bed-Space Board Logic
const roomsContainer = document.getElementById('rooms-container');
if (roomsContainer) {
  let currentFilter = 'all';
  let searchQuery = '';

  // Load saved bed assignments from localStorage
  function getBedData() {
    return JSON.parse(localStorage.getItem('angeles_beds') || '{}');
  }

  function saveBedData(data) {
    localStorage.setItem('angeles_beds', JSON.stringify(data));
  }

  // Calculate days left until end of rent
  function getRentStatus(endDateStr) {
    if (!endDateStr) return { status: 'vacant', label: 'Vacant', daysLeft: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr + 'T00:00:00');
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `Expired (${Math.abs(diffDays)}d ago)`, daysLeft: diffDays };
    } else if (diffDays === 0) {
      return { status: 'expiring', label: 'Ends Today', daysLeft: 0 };
    } else if (diffDays <= 3) {
      return { status: 'expiring', label: `Ends in ${diffDays}d`, daysLeft: diffDays };
    } else {
      return { status: 'active', label: `${diffDays}d left`, daysLeft: diffDays };
    }
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderBoard() {
    const bedData = getBedData();
    let totalVacant = 0;
    let totalOccupied = 0;
    let totalExpiring = 0;

    roomsContainer.innerHTML = ROOMS.map(room => {
      let roomVacantCount = 0;

      const bunksHTML = BUNK_SLOTS.map((slot, index) => {
        const bedId = `${room.id}-b${slot.deck}-${slot.pos.toLowerCase()}`;
        const occupant = bedData[bedId];
        const rentInfo = occupant ? getRentStatus(occupant.endDate) : { status: 'vacant' };

        if (!occupant) {
          totalVacant++;
          roomVacantCount++;
        } else {
          totalOccupied++;
          if (rentInfo.status === 'expired' || rentInfo.status === 'expiring') {
            totalExpiring++;
          }
        }

        // Apply Search & Filter
        if (currentFilter === 'vacant' && occupant) return '';
        if (currentFilter === 'expiring' && (!occupant || rentInfo.status === 'active')) return '';
        if (searchQuery && (!occupant || !occupant.guestName.toLowerCase().includes(searchQuery))) return '';

        // Card styling based on occupancy & rent end date
        let cardStyle = 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-400';
        let badgeHTML = `<span class="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">Available</span>`;

        if (occupant) {
          if (rentInfo.status === 'expired') {
            cardStyle = 'bg-red-50/70 border-red-300 hover:border-red-400';
            badgeHTML = `<span class="text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">${rentInfo.label}</span>`;
          } else if (rentInfo.status === 'expiring') {
            cardStyle = 'bg-amber-50/70 border-amber-300 hover:border-amber-400';
            badgeHTML = `<span class="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">${rentInfo.label}</span>`;
          } else {
            cardStyle = 'bg-white border-zinc-200 hover:border-zinc-400';
            badgeHTML = `<span class="text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">${rentInfo.label}</span>`;
          }
        }

        return `
          <button
            onclick="openBedModal('${bedId}', '${room.name}', 'Double Deck ${slot.deck} • ${slot.pos} Bunk')"
            class="w-full text-left p-3.5 rounded-2xl border ${cardStyle} transition flex items-center justify-between gap-3 cursor-pointer"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Deck ${slot.deck} • ${slot.pos}
                </span>
              </div>
              ${
                occupant
                  ? `<p class="font-semibold text-sm text-zinc-900 truncate mt-0.5">${occupant.guestName}</p>
                     <p class="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                       <i data-lucide="calendar" class="w-3 h-3"></i> Ends: <strong class="text-zinc-700">${formatDateDisplay(occupant.endDate)}</strong>
                     </p>`
                  : `<p class="text-xs font-medium text-emerald-700 mt-0.5">+ Tap to assign guest</p>`
              }
            </div>
            <div class="shrink-0">
              ${badgeHTML}
            </div>
          </button>
        `;
      }).join('');

      return `
        <div class="bg-white rounded-3xl border border-zinc-200/90 p-5 space-y-4 shadow-sm">
          <div class="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3.5">
            <div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${room.badgeColor}">
                <i data-lucide="${room.icon}" class="w-3 h-3"></i>
                ${room.badge}
              </span>
              <h2 class="text-lg font-bold text-zinc-900 mt-1.5">${room.name}</h2>
            </div>
            <div class="text-right">
              <span class="text-lg font-bold ${roomVacantCount > 0 ? 'text-emerald-600' : 'text-zinc-400'}">${roomVacantCount}/8</span>
              <span class="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Vacant</span>
            </div>
          </div>

          <div class="space-y-2.5">
            ${bunksHTML || `<p class="text-xs text-zinc-400 text-center py-6">No matching bunks in this room.</p>`}
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('stat-vacant').textContent = totalVacant;
    document.getElementById('stat-occupied').textContent = totalOccupied;
    document.getElementById('stat-expiring').textContent = totalExpiring;
    lucide.createIcons();
  }

  // Modal Controls
  const modal = document.getElementById('bunk-modal');
  const bunkForm = document.getElementById('bunk-form');
  const vacateBtn = document.getElementById('vacate-btn');

  window.openBedModal = function (bedId, roomName, bunkTitle) {
    const bedData = getBedData();
    const existing = bedData[bedId];

    document.getElementById('modal-bed-id').value = bedId;
    document.getElementById('modal-room-label').textContent = roomName;
    document.getElementById('modal-bunk-title').textContent = bunkTitle;

    if (existing) {
      document.getElementById('guest-name').value = existing.guestName;
      document.getElementById('start-date').value = existing.startDate || '';
      document.getElementById('end-date').value = existing.endDate;
      document.getElementById('guest-notes').value = existing.notes || '';
      vacateBtn.classList.remove('hidden');
    } else {
      bunkForm.reset();
      document.getElementById('modal-bed-id').value = bedId;
      document.getElementById('start-date').value = new Date().toISOString().split('T')[0];
      vacateBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  };

  document.getElementById('close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  bunkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const bedId = document.getElementById('modal-bed-id').value;
    const bedData = getBedData();

    bedData[bedId] = {
      guestName: document.getElementById('guest-name').value.trim(),
      startDate: document.getElementById('start-date').value,
      endDate: document.getElementById('end-date').value,
      notes: document.getElementById('guest-notes').value.trim()
    };

    saveBedData(bedData);
    modal.classList.add('hidden');
    renderBoard();
  });

  vacateBtn.addEventListener('click', () => {
    const bedId = document.getElementById('modal-bed-id').value;
