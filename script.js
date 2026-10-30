
const STUDENTS_KEY = "teachease_students";
const ATTENDANCE_KEY = "teachease_attendance";

const $ = id => document.getElementById(id);

function readData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let students = readData(STUDENTS_KEY);
let attendance = readData(ATTENDANCE_KEY);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function saveStudents() {
  saveData(STUDENTS_KEY, students);
}

function saveAttendanceData() {
  saveData(ATTENDANCE_KEY, attendance);
}

function getRecord(date) {
  return attendance.find(record => record.date === date);
}

function getStatus(date, studentId) {
  const record = getRecord(date);
  return record?.entries?.[studentId] || "";
}

/* NAVIGATION */

const pageTitles = {
  dashboard: "Dashboard",
  students: "Students",
  attendance: "Attendance",
  reports: "Reports"
};

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(item =>
      item.classList.remove("active")
    );

    document.querySelectorAll(".page").forEach(page =>
      page.classList.remove("active")
    );

    button.classList.add("active");
    $(button.dataset.page).classList.add("active");
    $("pageTitle").textContent = pageTitles[button.dataset.page];

    renderAll();
  });
});

/* STUDENTS */

$("studentForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("studentName").value.trim();
  const roll = $("rollNumber").value.trim();
  const studentClass = $("studentClass").value.trim();

  if (!name || !roll || !studentClass) {
    $("studentMessage").textContent = "Please fill in every field.";
    return;
  }

  const duplicate = students.some(student =>
    student.roll.toLowerCase() === roll.toLowerCase() &&
    student.studentClass.toLowerCase() === studentClass.toLowerCase()
  );

  if (duplicate) {
    $("studentMessage").textContent =
      "That roll number already exists in this class.";
    return;
  }

  students.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    roll,
    studentClass
  });

  saveStudents();
  $("studentForm").reset();
  $("studentMessage").textContent = "Student added successfully!";

  renderAll();
});

$("studentSearch").addEventListener("input", renderStudents);

function renderStudents() {
  const query = $("studentSearch").value.trim().toLowerCase();

  const filtered = students.filter(student =>
    student.name.toLowerCase().includes(query) ||
    student.roll.toLowerCase().includes(query) ||
    student.studentClass.toLowerCase().includes(query)
  );

  $("studentCount").textContent =
    `${students.length} student${students.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    $("studentList").innerHTML =
      '<p class="empty-state">No students found.</p>';
    return;
  }

  $("studentList").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Roll Number</th>
          <th>Class</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(student => `
          <tr>
            <td>${escapeHTML(student.name)}</td>
            <td>${escapeHTML(student.roll)}</td>
            <td>${escapeHTML(student.studentClass)}</td>
            <td>
              <button class="delete-btn"
                data-delete="${escapeHTML(student.id)}">
                Delete
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  $("studentList").querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.delete;

      if (!confirm("Delete this student and their attendance records?")) {
        return;
      }

      students = students.filter(student => student.id !== id);

      attendance = attendance.map(record => {
        const entries = { ...(record.entries || {}) };
        delete entries[id];
        return { ...record, entries };
      });

      saveStudents();
      saveAttendanceData();
      renderAll();
    });
  });
}

/* ATTENDANCE */

function renderAttendance() {
  const date = $("attendanceDate").value;

  if (students.length === 0) {
    $("attendanceList").innerHTML =
      '<p class="empty-state">Add students before marking attendance.</p>';
    return;
  }

  if (!date) {
    $("attendanceList").innerHTML =
      '<p class="empty-state">Choose an attendance date.</p>';
    return;
  }

  $("attendanceList").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Roll Number</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(student => {
          const status = getStatus(date, student.id);

          return `
            <tr>
              <td>${escapeHTML(student.name)}</td>
              <td>${escapeHTML(student.roll)}</td>
              <td>
                <select class="status-select"
                  data-student-id="${escapeHTML(student.id)}">
                  <option value="" ${status === "" ? "selected" : ""}>
                    Not marked
                  </option>
                  <option value="Present"
                    ${status === "Present" ? "selected" : ""}>
                    Present
                  </option>
                  <option value="Absent"
                    ${status === "Absent" ? "selected" : ""}>
                    Absent
                  </option>
                </select>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

$("attendanceDate").addEventListener("change", () => {
  $("dashboardDate").value = $("attendanceDate").value;
  $("calendarMonth").value = $("attendanceDate").value.slice(0, 7);
  $("attendanceMessage").textContent = "";
  renderAll();
});

$("dashboardDate").addEventListener("change", () => {
  if (!$("dashboardDate").value) return;

  $("attendanceDate").value = $("dashboardDate").value;
  $("calendarMonth").value = $("dashboardDate").value.slice(0, 7);
  renderAll();
});

$("saveAttendance").addEventListener("click", () => {
  const date = $("attendanceDate").value;

  if (!date) {
    $("attendanceMessage").textContent = "Please select a date.";
    return;
  }

  const selects = [
    ...$("attendanceList").querySelectorAll("[data-student-id]")
  ];

  const entries = {};

  for (const select of selects) {
    if (!select.value) {
      $("attendanceMessage").textContent =
        "Please mark every student Present or Absent.";
      return;
    }

    entries[select.dataset.studentId] = select.value;
  }

  const index = attendance.findIndex(record => record.date === date);
  const record = { date, entries };

  if (index >= 0) {
    attendance[index] = record;
  } else {
    attendance.push(record);
  }

  attendance.sort((a, b) => a.date.localeCompare(b.date));
  saveAttendanceData();

  $("dashboardDate").value = date;
  $("calendarMonth").value = date.slice(0, 7);
  $("attendanceMessage").textContent = "Attendance saved successfully!";

  renderAll();
});

function getDateCounts(date) {
  const record = getRecord(date);
  const entries = record?.entries || {};

  let present = 0;
  let absent = 0;

  students.forEach(student => {
    if (entries[student.id] === "Present") present++;
    if (entries[student.id] === "Absent") absent++;
  });

  return { present, absent };
}

/* DASHBOARD */

function renderDashboard() {
  const date = $("dashboardDate").value;
  const counts = getDateCounts(date);
  const total = students.length;
  const marked = counts.present + counts.absent;

  $("totalStudents").textContent = total;
  $("presentStudents").textContent = counts.present;
  $("absentStudents").textContent = counts.absent;

  const percentage = marked ? Math.round(counts.present / marked * 100) : 0;
  $("attendancePercentage").textContent = `${percentage}%`;

  $("chartDateLabel").textContent = date
    ? formatDate(date)
    : "No date selected";

  $("chartPresent").textContent = counts.present;
  $("chartAbsent").textContent = counts.absent;

  const maximum = Math.max(counts.present, counts.absent, 1);
  $("presentBar").style.height =
    `${counts.present / maximum * 150}px`;
  $("absentBar").style.height =
    `${counts.absent / maximum * 150}px`;

  $("chartNote").textContent = getRecord(date)
    ? `${marked} of ${total} students marked.`
    : "No attendance saved for this date.";

  renderRecentActivity();
}

function renderRecentActivity() {
  const recent = [...attendance]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (!recent.length) {
    $("recentActivity").innerHTML =
      '<p class="muted">No recent attendance activity.</p>';
    return;
  }

  $("recentActivity").innerHTML = recent.map(record => {
    const counts = getDateCounts(record.date);

    return `
      <div class="activity-item">
        <strong>${escapeHTML(formatDate(record.date))}</strong>
        <p>${counts.present} present · ${counts.absent} absent</p>
      </div>
    `;
  }).join("");
}

/* CALENDAR */

$("calendarMonth").addEventListener("change", () => {
  const month = $("calendarMonth").value;
  if (!month) return;

  if ($("attendanceDate").value.slice(0, 7) !== month) {
    $("attendanceDate").value = `${month}-01`;
    $("dashboardDate").value = $("attendanceDate").value;
  }

  renderAll();
});

function renderCalendar() {
  const monthValue = $("calendarMonth").value;

  if (!monthValue) {
    $("attendanceCalendar").innerHTML = "";
    return;
  }

  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const selectedDate = $("attendanceDate").value;

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = weekdays.map(day =>
    `<div class="calendar-day heading">${day}</div>`
  ).join("");

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const saved = Boolean(getRecord(date));
    const selected = date === selectedDate;

    html += `
      <button type="button"
        class="calendar-day ${saved ? "saved" : ""} ${selected ? "selected" : ""}"
        data-calendar-date="${date}"
        aria-label="${date}${saved ? ", attendance saved" : ""}">
        ${day}${saved ? " ✓" : ""}
      </button>
    `;
  }

  $("attendanceCalendar").innerHTML = html;

  $("attendanceCalendar").querySelectorAll("[data-calendar-date]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const date = button.dataset.calendarDate;

        $("attendanceDate").value = date;
        $("dashboardDate").value = date;
        $("attendanceMessage").textContent = "";

        renderAll();
      });
    });
}

/* REPORTS */

function renderReports() {
  if (!students.length) {
    $("reportList").innerHTML =
      '<p class="empty-state">No student records available.</p>';
    return;
  }

  const records = attendance.filter(record =>
    Object.values(record.entries || {}).some(status =>
      status === "Present" || status === "Absent"
    )
  );

  $("reportList").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Roll Number</th>
          <th>Class</th>
          <th>Present</th>
          <th>Absent</th>
          <th>Marked Days</th>
          <th>Attendance %</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(student => {
          let present = 0;
          let absent = 0;

          records.forEach(record => {
            const status = record.entries?.[student.id];
            if (status === "Present") present++;
            if (status === "Absent") absent++;
          });

          const marked = present + absent;
          const percentage = marked
            ? Math.round(present / marked * 100)
            : 0;

          return `
            <tr>
              <td>${escapeHTML(student.name)}</td>
              <td>${escapeHTML(student.roll)}</td>
              <td>${escapeHTML(student.studentClass)}</td>
              <td>${present}</td>
              <td>${absent}</td>
              <td>${marked}</td>
              <td>${percentage}%</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

/* CSV EXPORT */

function downloadCSV(filename, rows) {
  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

$("exportAttendance").addEventListener("click", () => {
  const date = $("attendanceDate").value;

  if (!date) {
    $("attendanceMessage").textContent = "Please select a date first.";
    return;
  }

  const record = getRecord(date);

  if (!record) {
    $("attendanceMessage").textContent =
      "Save attendance before exporting.";
    return;
  }

  const rows = [
    ["Date", "Student Name", "Roll Number", "Class", "Status"]
  ];

  students.forEach(student => {
    rows.push([
      date,
      student.name,
      student.roll,
      student.studentClass,
      record.entries?.[student.id] || "Not marked"
    ]);
  });

  downloadCSV(`attendance-${date}.csv`, rows);
});

$("exportReport").addEventListener("click", () => {
  const rows = [[
    "Student Name", "Roll Number", "Class",
    "Present", "Absent", "Marked Days", "Attendance Percentage"
  ]];

  students.forEach(student => {
    let present = 0;
    let absent = 0;

    attendance.forEach(record => {
      const status = record.entries?.[student.id];
      if (status === "Present") present++;
      if (status === "Absent") absent++;
    });

    const marked = present + absent;
    const percentage = marked
      ? Math.round(present / marked * 100)
      : 0;

    rows.push([
      student.name,
      student.roll,
      student.studentClass,
      present,
      absent,
      marked,
      `${percentage}%`
    ]);
  });

  downloadCSV("teachease-report.csv", rows);
});

/* REFRESH EVERYTHING */

function renderAll() {
  renderStudents();
  renderAttendance();
  renderDashboard();
  renderCalendar();
  renderReports();
}

/* INITIAL SETUP */

const today = localDateString();

$("attendanceDate").value = today;
$("dashboardDate").value = today;
$("calendarMonth").value = today.slice(0, 7);

renderAll();



