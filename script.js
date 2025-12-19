// ================== DATA USERS ==================
const users = [
  { username: "bendahara", password: "bendahara101", role: "admin" },
  { username: "siswa", password: "siswatkj", role: "student" }
];

let students = [];
let transactions = [];
let currentUser = null;

// ================== UTIL ==================
const rupiah = n => "Rp " + n.toLocaleString("id-ID");

function showNotif(msg) {
  const n = document.getElementById("notif");
  n.innerText = msg;
  n.classList.remove("hidden");
  setTimeout(() => n.classList.add("hidden"), 2000);
}

// ================== LOGIN ==================
function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const r = document.getElementById("role").value;

  const user = users.find(x => x.username === u && x.password === p && x.role === r);

  if (!user) {
    alert("Username / Password salah");
    return;
  }

  currentUser = user;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  if (user.role === "admin") {
    document.getElementById("adminPanel").classList.remove("hidden");
  }

  render();
}

function logout() {
  location.reload();
}

// ================== FORM ==================
function onJenisChange() {
  const jenis = document.getElementById("jenis").value;
  const siswa = document.getElementById("siswa");
  if (jenis === "out") siswa.classList.add("hidden");
  else siswa.classList.remove("hidden");
}

// ================== INPUT RUPIAH ==================
document.addEventListener("input", e => {
  if (e.target.id === "jumlah") {
    let val = e.target.value.replace(/\D/g, "");
    e.target.value = val ? rupiah(Number(val)) : "";
  }
});

// ================== FIRESTORE FUNCTIONS ==================

// Load students from Firestore
async function loadStudents() {
  try {
    const snapshot = await db.collection("students").get();
    students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("ERROR Load Students:", e);
  }
}

// Load transactions from Firestore
async function loadTransactions() {
  try {
    const snapshot = await db.collection("transactions").orderBy("tanggal", "desc").get();
    transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("ERROR Load Transactions:", e);
  }
}

// ================== TRANSAKSI ==================
async function tambah() {
  const jenis = document.getElementById("jenis").value;
  const ket = document.getElementById("ket").value;
  const jumlahRaw = document.getElementById("jumlah").value.replace(/\D/g, "");
  const jumlah = Number(jumlahRaw);

  if (!ket || !jumlah) {
    alert("Lengkapi data");
    return;
  }

  let sid = null;

  if (jenis === "in") {
    sid = document.getElementById("siswa").value;
    if (!sid) { alert("Pilih siswa"); return; }

    // Update saldo siswa di Firestore
    const studentRef = db.collection("students").doc(sid);
    const studentDoc = await studentRef.get();
    const newSaldo = (studentDoc.data().saldo || 0) + jumlah;
    await studentRef.update({ saldo: newSaldo });
  }

  // Tambahkan transaksi ke Firestore
  await db.collection("transactions").add({
    jenis,
    ket,
    jumlah,
    sid,
    tanggal: new Date().toISOString()
  });

  showNotif("✅ Transaksi berhasil disimpan");

  document.getElementById("ket").value = "";
  document.getElementById("jumlah").value = "";

  render();
}

// ================== HAPUS TRANSAKSI ==================
async function hapus(id, sid, jumlah) {
  if (sid && jumlah) {
    // Kembalikan saldo siswa
    const studentRef = db.collection("students").doc(sid);
    const studentDoc = await studentRef.get();
    await studentRef.update({ saldo: (studentDoc.data().saldo || 0) - jumlah });
  }

  // Hapus transaksi dari Firestore
  await db.collection("transactions").doc(id).delete();

  render();
}

// ================== RENDER ==================
async function render() {
  await loadStudents();
  await loadTransactions();

  // Dropdown siswa
  const siswaSelect = document.getElementById("siswa");
  siswaSelect.innerHTML = "";
  students.forEach(s => {
    siswaSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });

  // List siswa
  const list = document.getElementById("listSiswa");
  list.innerHTML = "";
  students.forEach(s => {
    list.innerHTML += `<li class="border p-2 mb-1">${s.name} — <b>${rupiah(s.saldo)}</b></li>`;
  });

  // Riwayat transaksi
  const riwayat = document.getElementById("riwayat");
  riwayat.innerHTML = "";
  let masuk = 0, keluar = 0;
  transactions.forEach(t => {
    if (t.jenis === "in") masuk += t.jumlah;
    else keluar += t.jumlah;

    const name = t.sid ? students.find(s => s.id === t.sid)?.name : "Kas Umum";

    riwayat.innerHTML += `
      <tr>
        <td class="border p-2">${new Date(t.tanggal).toLocaleString("id-ID")}</td>
        <td class="border p-2">${name}</td>
        <td class="border p-2">${t.ket}</td>
        <td class="border p-2">${rupiah(t.jumlah)}</td>
        <td class="border p-2">${t.jenis}</td>
        <td class="border p-2">
          ${currentUser.role === "admin" ? `<button onclick="hapus('${t.id}', '${t.sid}', ${t.jenis === 'in' ? t.jumlah : 0})" class="text-red-600">Hapus</button>` : "-"}
        </td>
      </tr>`;
  });

  document.getElementById("totalMasuk").innerText = rupiah(masuk);
  document.getElementById("totalKeluar").innerText = rupiah(keluar);
  document.getElementById("totalSaldo").innerText = rupiah(students.reduce((a,b)=>a+b.saldo,0));
}

// ================== TEST FIRESTORE ==================
async function testFirestore() {
  try {
    await db.collection("test").add({ message: "Dari Web OK", time: new Date() });
    console.log("🔥 Firestore connected");
  } catch (e) {
    console.error("❌ Firestore error", e);
  }
}

testFirestore();
