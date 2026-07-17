const TEAM_PIN = "1234"; 
const URL_API_POSTBACK = "https://script.google.com/macros/s/AKfycbxXXX-q4yHszHXu0xxuh5cmmOSCO_6ts-u0fPYTqR9vM4vx-O-Y5leghtKq3thdoo8/exec"; 

let globalAdblueData = [];
let globalPembayaranAdblueData = []; 
let currentDataLimit = 30; 
let autoRefreshInterval = null;

// ==========================================
// 1. LOGIKA LOGIN (INSTANT FETCH)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const loginOverlay = document.getElementById('login-overlay');
    const savedPin = sessionStorage.getItem("lupo_pin");

    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        setTimeout(() => { 
            loginOverlay.style.opacity = '1'; 
        }, 100);
    }

    if(savedPin === TEAM_PIN) {
        document.getElementById('login-pin').value = savedPin;
        prosesLogin();
    }
});

function prosesLogin() {
    const pin = document.getElementById('login-pin').value;
    if (pin === TEAM_PIN) {
        sessionStorage.setItem("lupo_pin", pin); 
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex'; 
        
        // PERBAIKAN 1: Tarik data SECARA INSTAN saat login berhasil
        fetchPostbackData();
        
        // Mulai auto-sync di latar belakang tiap 30 detik (tanpa henti)
        if (!autoRefreshInterval) {
            autoRefreshInterval = setInterval(fetchPostbackData, 30000);
        }
    } else {
        alert("PIN Salah!");
    }
}

function logout() {
    sessionStorage.removeItem("lupo_pin");
    if(autoRefreshInterval) clearInterval(autoRefreshInterval);
    location.reload(); 
}

// ==========================================
// 2. LOGIKA PINDAH HALAMAN (INSTANT NAVIGATION)
// ==========================================
function showPage(pageId, btnElement) {
    // PERBAIKAN 2: Navigasi murni CSS, tidak ada lagi reset interval atau delay!
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const page = document.getElementById(pageId);
    if(page) page.style.display = 'block';
    
    // Aktifkan tombol yang diklik
    if(btnElement) {
        btnElement.classList.add('active');
    } else {
        // Khusus untuk link dari dalam halaman (tanpa klik sidebar)
        const activeBtn = document.querySelector(`button[onclick*="${pageId}"]`);
        if(activeBtn) activeBtn.classList.add('active');
    }
    
    const titleMap = {
        'page-postback': 'Network Data Stream',
        'page-ranking': 'Elite Ranks',
        'page-riwayat': 'Payout History',
        'page-link': 'Promotion Links',
        'page-video': 'Video Assets',
        'page-jam': 'Spam Schedule',
        'page-snk': 'Security Rules',
        'page-tutorial': 'System Manual'
    };
    const titleEl = document.getElementById('topbar-text');
    if(titleEl) titleEl.innerText = titleMap[pageId] || 'Overview';
}

// ==========================================
// 3. LOGIKA TARIK DATA & FILTER
// ==========================================
function fetchPostbackData() {
    fetch(URL_API_POSTBACK + "?limit=" + currentDataLimit + "&t=" + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            globalAdblueData = data.konversi_adblue || [];
            globalPembayaranAdblueData = data.pembayaran_adblue || [];
            
            populateSubIdFilter(); 
            applyFilter(); 
            renderRiwayatPembayaran(globalPembayaranAdblueData);
            
            const totalServerData = data.total_semua_data || 0;
            const btnLoad = document.getElementById('btn-load-more');
            if(btnLoad) {
                if (globalAdblueData.length >= totalServerData) {
                    btnLoad.style.display = 'none'; 
                } else {
                    btnLoad.style.display = 'block';
                }
            }
        })
        .catch(console.error);
}

function loadMoreData() {
    currentDataLimit += 30; 
    fetchPostbackData();
}

function populateSubIdFilter() {
    const select = document.getElementById('filter-subid');
    if(!select) return;
    const currentVal = select.value;
    const uniqueSubIds = [...new Set(globalAdblueData.map(item => item.sub_1 || item.sub_id || '-'))].filter(s => s !== '-');
    
    select.innerHTML = '<option value="all">All Sub-IDs</option>';
    uniqueSubIds.forEach(subId => { select.innerHTML += `<option value="${subId}">${subId}</option>`; });
    select.value = currentVal;
}

function applyFilter() {
    const filterSubId = document.getElementById('filter-subid') ? document.getElementById('filter-subid').value : 'all';
    const filteredData = globalAdblueData.filter(row => {
        const valSubId = row.sub_1 || row.sub_id || '-';
        return filterSubId === 'all' || valSubId === filterSubId;
    });

    renderTable(filteredData);
    renderSummary(filteredData); 
    renderLeaderboard(globalAdblueData);
}

// ==========================================
// 4. RENDER TABEL & TAMPILAN
// ==========================================
function renderTable(data) {
    const tbody = document.getElementById('tabel-postback-body');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No data available.</td></tr>';
        return;
    }
    data.forEach(row => {
        const valSubId = row.sub_1 || '-';
        const valPayout = row.payout || '0';
        tbody.innerHTML += `
            <tr>
                <td class="text-muted" style="font-family: monospace; font-size:12px;">${row.waktu || '-'}</td>
                <td style="font-weight: 700;" class="text-blue">${valSubId.toUpperCase()}</td>
                <td>${row.offer_name || '-'}</td>
                <td style="font-weight: 600;">${(row.country_code || '-').toUpperCase()}</td>
                <td class="text-green" style="font-weight: 700;">$${valPayout}</td>
                <td><span class="badge-status status-approve"><i class="fa-solid fa-check"></i> VERIFIED</span></td>
            </tr>`;
    });
}

function renderSummary(data) {
    const elTotal = document.getElementById('sum-total');
    const elRev = document.getElementById('sum-revenue');
    if(elTotal) elTotal.innerText = data.length;
    if(elRev) {
        let rev = 0;
        data.forEach(r => rev += parseFloat(r.payout || 0));
        elRev.innerText = "$" + rev.toFixed(2);
    }
}

// ==========================================
// 5. LEADERBOARD (DENGAN SISA SALDO & FILTER WAKTU)
// ==========================================
let currentRankFilter = 'monthly';
function changeRankFilter(filterType, btnElement) {
    currentRankFilter = filterType;
    document.querySelectorAll('.btn-rank-filter').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilter();
}

function parseDateString(dateStr) {
    if (!dateStr || dateStr === '-') return new Date(0);
    const parts = dateStr.split(' ');
    const dmy = parts[0].split('/');
    return new Date(dmy[2], dmy[1] - 1, dmy[0]);
}

function renderLeaderboard(data) {
    let kalkulasi = {};
    const skrg = new Date();
    const hariIni = new Date(skrg.getFullYear(), skrg.getMonth(), skrg.getDate());

    data.forEach(row => {
        const subIdRaw = row.sub_1 || row.sub_id || '-';
        if(subIdRaw !== '-') {
            let nama = subIdRaw.toUpperCase();
            let dolar = parseFloat(row.payout) || 0;
            
            if (!kalkulasi[nama]) {
                kalkulasi[nama] = { totalLead: 0, pendapatan: 0, allTimePendapatan: 0, total_dicairkan: 0 };
            }
            
            // All time pendapatan untuk hitungan Sisa Saldo mutlak
            kalkulasi[nama].allTimePendapatan += dolar;

            // Filter Waktu Khusus untuk Peringkat
            const tglData = parseDateString(row.waktu);
            let lolosFilter = (currentRankFilter === 'all') || 
                (currentRankFilter === 'today' && tglData.getTime() === hariIni.getTime()) ||
                (currentRankFilter === 'weekly' && (hariIni - tglData) / (1000 * 60 * 60 * 24) <= 7) ||
                (currentRankFilter === 'monthly' && tglData.getMonth() === skrg.getMonth() && tglData.getFullYear() === skrg.getFullYear());

            if (lolosFilter) {
                kalkulasi[nama].totalLead += 1;
                kalkulasi[nama].pendapatan += dolar; 
            }
        }
    });

    if (globalPembayaranAdblueData && globalPembayaranAdblueData.length > 0) {
        globalPembayaranAdblueData.forEach(payRow => {
            const statusPay = String(payRow.status || '').toLowerCase();
            if (statusPay.includes('berhasil')) {
                 const subIdPayRaw = payRow.sub_id || payRow.sub_1 || '-';
                 if (subIdPayRaw !== '-') {
                     const subIdPay = subIdPayRaw.toUpperCase();
                     const nominalPay = parseFloat(payRow.nominal_usd || payRow.nominal || payRow.payout) || 0;
                     if (!kalkulasi[subIdPay]) kalkulasi[subIdPay] = { totalLead: 0, pendapatan: 0, allTimePendapatan: 0, total_dicairkan: 0 };
                     kalkulasi[subIdPay].total_dicairkan += nominalPay;
                 }
            }
        });
    }

    let arrayRanking = [];
    Object.keys(kalkulasi).forEach(kunci => {
        let memberData = kalkulasi[kunci];
        let sisaSaldo = memberData.allTimePendapatan - memberData.total_dicairkan;
        if (sisaSaldo < 0) sisaSaldo = 0; 
        
        if (memberData.totalLead > 0 || sisaSaldo > 0) {
            arrayRanking.push({ nama: kunci, ...memberData, sisaSaldo: sisaSaldo });
        }
    });

    arrayRanking.sort((a, b) => b.pendapatan - a.pendapatan);
    
    const tbody = document.getElementById('tabel-ranking-body');
    if(!tbody) return;
    tbody.innerHTML = arrayRanking.length === 0 ? '<tr><td colspan="5" class="text-center text-muted py-4">Data belum tersedia untuk periode ini.</td></tr>' : '';

    arrayRanking.forEach((member, index) => {
        let piala = index + 1;
        if(index === 0) piala = '<i class="fa-solid fa-trophy text-yellow"></i>';
        else if(index === 1) piala = '<i class="fa-solid fa-medal text-muted"></i>';
        else if(index === 2) piala = '<i class="fa-solid fa-medal" style="color: #cd7f32;"></i>';
        
        tbody.innerHTML += `
            <tr>
                <td class="text-center" style="font-weight:700;">${piala}</td>
                <td class="text-blue" style="font-weight:700;">${member.nama}</td>
                <td style="font-weight:600;">${member.totalLead} Leads</td>
                <td class="text-green" style="font-weight:700;">$ ${member.pendapatan.toFixed(2)}</td>
                <td style="color: #f59e0b; font-weight:800; background: rgba(245, 158, 11, 0.1); text-align: center; border-radius:4px;">$ ${member.sisaSaldo.toFixed(2)}</td>
            </tr>`;
    });
}

function renderRiwayatPembayaran(payments) {
    const tbody = document.getElementById('tabel-riwayat-body');
    if(!tbody) return; 
    tbody.innerHTML = '';
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Belum ada riwayat pembayaran.</td></tr>';
        return;
    }
    
    [...payments].reverse().forEach(row => {
        const valSubId = row.sub_id || row.sub_1 || '-';
        const valNominal = row.nominal_usd || row.nominal || row.payout || '-';
        const status = String(row.status || 'Berhasil');
        const badge = status.toLowerCase().includes('berhasil') ? 
            `<span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-check-circle"></i> ${status}</span>` :
            `<span style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-spinner"></i> ${status}</span>`;
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;" class="text-muted">${row.tanggal || '-'}</td>
                <td class="text-blue" style="font-weight: 700;">${valSubId.toUpperCase()}</td>
                <td class="text-green" style="font-weight: 700;">$${valNominal === '-' ? '0' : valNominal}</td>
                <td>${badge}</td>
            </tr>`;
    });
}

// ==========================================
// 6. TOOLS MEDIA & LINKS
// ==========================================
const linksAdblueData = {
    'thorfin': { 'travel town': "https://tinyurl.com/4s2vpykk", 'gossip harbor': "https://tinyurl.com/4wuj53bc", 'coin master': "https://tinyurl.com/ymrnybxv", 'monopoly go': "https://tinyurl.com/c4jzht6v"},
    'poseidon': { 'travel town': "https://tinyurl.com/5dsxcz58", 'gossip harbor': "https://tinyurl.com/2fev6kd6", 'coin master': "https://tinyurl.com/4v2vr535", 'monopoly go': "https://tinyurl.com/3k9yvwzv"},
    'luxury33': { 'travel town': "https://tinyurl.com/yvp5xjbz", 'gossip harbor': "https://tinyurl.com/byekcyus"},
    'batako': { 'travel town': "https://tinyurl.com/bdhv9b48", 'gossip harbor': "https://tinyurl.com/5n7rwy4h", 'monopoly go': "https://tinyurl.com/3476cfvk", 'coin master': "https://tinyurl.com/27rctxnu"},
    'kahuna': { 'travel town': "https://tinyurl.com/4p28fcem", 'gossip harbor': "https://tinyurl.com/ms9fuxcc"},
    'heisenberg': { 'travel town': "https://tinyurl.com/4nvau4n2", 'gossip harbor': "https://tinyurl.com/3suftfma", 'coin master': "https://tinyurl.com/3fdp7fzw", 'monopoly go': "https://tinyurl.com/nwtwtvn2"},
    'hiltopia': { 'travel town':"https://tinyurl.com/jxczj27u", 'gossip harbor': "https://tinyurl.com/mwchjnnn"},
    'ucup': { 'travel town': "https://tinyurl.com/tzb6ry7b", 'gossip harbor': "https://tinyurl.com/ms957env", 'coin master': "https://tinyurl.com/dwha2yf9", 'monopoly go': "https://tinyurl.com/93t9kmp6"}, 
    'reymunz': { 'travel town': "https://tinyurl.com/2vau3m47", 'gossip harbor': "https://tinyurl.com/2rayv565", 'coin master': "https://tinyurl.com/mprnaest", 'monopoly go': "https://tinyurl.com/kwhcn9cw"}, 
    'reno': { 'travel town' :"https://tinyurl.com/d6j55msm", 'gossip harbor': "https://tinyurl.com/33ehn64c"}, 
    'galon': {'travel town':"https://tinyurl.com/4yn47bty", 'gossip harbor': "https://tinyurl.com/3kmw74n4"}, 
    'jadud': {'gossip harbor':" https://tinyurl.com/4bfb77ub", 'travel town': "https://tinyurl.com/bdz7ftj4", 'monopoly go': "https://tinyurl.com/493djspp"}, 
    'panci': {'gossip harbor':"https://tinyurl.com/54k9nats", 'travel town': "https://tinyurl.com/3dy934a2"}
};

function openLink(id, nama) {
    const listMember = document.getElementById('list-member');
    const detailLink = document.getElementById('detail-link');
    if(!listMember || !detailLink) return;
    
    listMember.style.display = 'none';
    detailLink.style.display = 'block';
    document.getElementById('active-name').innerHTML = `<i class="fa-solid fa-user-ninja"></i> Operative: ${nama}`;
    const area = document.getElementById('render-links');
    area.innerHTML = '';
    
    const dataTarget = linksAdblueData[id];
    if(!dataTarget) {
        area.innerHTML = '<p class="text-muted">Link promosi belum tersedia.</p>';
        return;
    }
    
    for (const [game, url] of Object.entries(dataTarget)) {
        if(url === "-" || url === "") continue;
        area.innerHTML += `
            <div class="link-box sci-fi-box">
                <span style="text-transform: capitalize; color: var(--orange);"><i class="fa-solid fa-link"></i> ${game}</span>
                <input type="text" value="${url}" id="in-${id}-${game.replace(/\s+/g, '')}" class="cyber-input" readonly>
                <button class="btn-cyber" onclick="copyFunc('in-${id}-${game.replace(/\s+/g, '')}', this)"><i class="fa-solid fa-copy"></i> Copy</button>
            </div>`;
    }
}

function backToMembers() {
    document.getElementById('detail-link').style.display = 'none';
    document.getElementById('list-member').style.display = 'grid';
}

function copyFunc(id, btn) {
    const input = document.getElementById(id);
    if(input) {
        input.select(); navigator.clipboard.writeText(input.value);
        btn.innerHTML = "<i class='fa-solid fa-check'></i> Copied";
        btn.style.background = "#10b981";
        setTimeout(() => { 
            btn.innerHTML = "<i class='fa-solid fa-copy'></i> Copy";
            btn.style.background = "linear-gradient(90deg, var(--orange), #d94f00)"; 
        }, 1500);
    }
}

// ==========================================
// 7. FOLDER VIDEO LOGIC 
// ==========================================
const vidsData = {
    'monopoly': ['https://files.catbox.moe/c1aor9.mp4','https://files.catbox.moe/eb8owm.mp4','https://files.catbox.moe/mk2paa.mp4','https://files.catbox.moe/ru6c2z.mp4','https://files.catbox.moe/t7qo17.mp4','https://files.catbox.moe/ryd2f3.mp4','https://files.catbox.moe/pfi6rf.mp4'],
    'gossip': ['https://files.catbox.moe/n3dxf8.mp4','https://files.catbox.moe/d7zs6m.mp4','https://files.catbox.moe/vuxkxb.mp4','https://files.catbox.moe/tt1w1r.mp4','https://files.catbox.moe/vo04ze.mp4','https://files.catbox.moe/40yyrg.mp4','https://files.catbox.moe/pfg5gn.mp4','https://files.catbox.moe/siukyb.mp4','https://files.catbox.moe/92s5ye.mp4','https://files.catbox.moe/vhryep.mp4','https://files.catbox.moe/35erpp.mp4'],
    'travel': ['https://files.catbox.moe/xa52ht.mp4','https://files.catbox.moe/0qyiy2.mp4','https://files.catbox.moe/so3wfw.mp4','https://files.catbox.moe/488yew.mp4','https://files.catbox.moe/jm5ym7.mp4','https://files.catbox.moe/ge8m5k.mp4']
};

function openVideo(id, judul) {
    const folderView = document.getElementById('video-folder-view');
    const listView = document.getElementById('video-list-view');
    const renderArea = document.getElementById('render-videos');
    
    if(folderView && listView && renderArea) {
        folderView.style.display = 'none';
        listView.style.display = 'block';
        document.getElementById('active-game-title').innerText = "Video " + judul;
        
        renderArea.innerHTML = ''; 
        vidsData[id].forEach((v, i) => {
            const div = document.createElement('div');
            div.className = 'video-card sci-fi-box';
            div.style.cssText = 'padding:10px; margin-bottom:15px; border-radius:8px;';
            div.innerHTML = `<video src="${v}" controls style="width: 100%; max-width: 100%; height: auto; background: #000;"></video>
                             <a href="${v}" download class="btn-cyber w-100" style="display:block; text-align:center; margin-top:5px;">Unduh Part ${i+1}</a>`;
            renderArea.appendChild(div);
        });
    }
}

function closeVideo() {
    const folderView = document.getElementById('video-folder-view');
    const listView = document.getElementById('video-list-view');
    
    if(folderView && listView) {
        folderView.style.display = 'grid';
        listView.style.display = 'none';
        document.querySelectorAll('video').forEach(v => v.pause());
    }
}

// ==========================================
// 8. FILTER PENCARIAN (PERBAIKAN BUG)
// ==========================================
function filterPayouts() {
    const input = document.getElementById('payout-search');
    const filter = input.value.toLowerCase();
    
    // PERBAIKAN 3: Sesuaikan target ID dengan tabel riwayat di file HTML
    const tableBody = document.getElementById('tabel-riwayat-body');
    if(!tableBody) return;
    
    const tr = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < tr.length; i++) {
        let textContent = tr[i].textContent.toLowerCase();
        tr[i].style.display = (textContent.indexOf(filter) > -1) ? "" : "none";
    }
}
