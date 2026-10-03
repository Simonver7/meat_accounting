"use strict";

const TOKEN_KEY = "meat_accounting_access_token";

const API = {
    me: "/api/v1/auth/me",
    reports: "/api/v1/reports",
};

let reportState = {
    period: "today",
    dateFrom: null,
    dateTo: null,
};

const elements = {
    reportDate: document.getElementById("report-date"),
    opening: document.getElementById("opening-stock"),
    incoming: document.getElementById("incoming-value"),
    spit: document.getElementById("spit-value"),
    closing: document.getElementById("closing-stock"),
    excelButton: document.getElementById("excel-button"),
    lastUpdate: document.getElementById("last-update"),
    toast: document.getElementById("toast"),
};

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setText(element, value) {
    if (!element) return;
    element.textContent = value;
}

function formatKg(value) {
    if (value === null || value === undefined || value === "") {
        return "?";
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "?";
    }

    return new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(number);
}

function formatSignedKg(value) {
    if (value === null || value === undefined || value === "") {
        return "?";
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        return "?";
    }

    if (number === 0) {
        return "0";
    }

    const sign = number > 0 ? "+" : "?";
    return `${sign}${formatKg(Math.abs(number))}`;
}

function formatRange(dateFrom, dateTo) {
    if (!dateFrom && !dateTo) {
        return "???????";
    }

    const formatter = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
    });

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    if (from && to && from.getTime() === to.getTime()) {
        return formatter.format(from);
    }

    if (from && to) {
        return `${formatter.format(from)} ? ${formatter.format(to)}`;
    }

    if (from) {
        return formatter.format(from);
    }

    return "???????";
}

let toastTimer = null;

function showToast(message) {
    if (!elements.toast) return;

    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("visible");
    }, 3000);
}

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
        throw new Error("?????? ???????");
    }

    let data = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message = data?.detail || data?.message || "?? ??????? ????????? ??????";
        throw new Error(message);
    }

    return data;
}

async function checkAuth() {
    const token = getToken();

    if (!token) {
        window.location.href = "/";
        return false;
    }

    try {
        await apiFetch(API.me);
        return true;
    } catch (error) {
        console.error("Auth error:", error);
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
        return false;
    }
}

function selectReportRow(report) {
    const items = Array.isArray(report?.items) ? report.items : [];
    return (
        items.find((item) => item.meat_type === "SKIN") ||
        items.find((item) => item.meat_type === "FILLET") ||
        items[0] ||
        null
    );
}

function buildReportUrl(period = "today", dateFrom = null, dateTo = null) {
    const params = new URLSearchParams({ period });

    if (dateFrom) {
        params.set("date_from", dateFrom);
    }

    if (dateTo) {
        params.set("date_to", dateTo);
    }

    return `${API.reports}?${params.toString()}`;
}

function buildExportUrl() {
    const params = new URLSearchParams({ period: reportState.period || "today" });

    if (reportState.dateFrom) {
        params.set("date_from", reportState.dateFrom);
    }

    if (reportState.dateTo) {
        params.set("date_to", reportState.dateTo);
    }

    return `/api/v1/exports/excel?${params.toString()}`;
}

function renderReport(report) {
    const row = selectReportRow(report);
    reportState = {
        period: report?.period || "today",
        dateFrom: report?.date_from || null,
        dateTo: report?.date_to || null,
    };

    setText(elements.reportDate, formatRange(report?.date_from, report?.date_to));

    if (!row) {
        setText(elements.opening, "?");
        setText(elements.incoming, "?");
        setText(elements.spit, "?");
        setText(elements.closing, "?");
        setText(elements.lastUpdate, "?????? ???????????");
        return;
    }

    setText(elements.opening, formatKg(row.opening));
    setText(elements.incoming, formatSignedKg(row.incoming));
    setText(elements.spit, formatSignedKg(row.spit));
    setText(elements.closing, formatKg(row.closing));

    const now = new Date();
    const updateLabel = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(now);

    setText(elements.lastUpdate, `??????????: ${updateLabel}`);
}

async function loadReport(period = "today", dateFrom = null, dateTo = null) {
    try {
        const url = buildReportUrl(period, dateFrom, dateTo);
        const data = await apiFetch(url);
        renderReport(data);
        return data;
    } catch (error) {
        console.error("Report error:", error);
        showToast("?? ??????? ????????? ?????");
        setText(elements.reportDate, "???????");
        setText(elements.opening, "?");
        setText(elements.incoming, "?");
        setText(elements.spit, "?");
        setText(elements.closing, "?");
        setText(elements.lastUpdate, "?????? ????????");
        return null;
    }
}

async function downloadExcel() {
    const token = getToken();

    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
        const response = await fetch(buildExportUrl(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        });

        if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/";
            return;
        }

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.detail || "?? ??????? ??????? Excel");
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") || "";
        const match = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = match ? match[1] : "meat_report.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Excel export error:", error);
        showToast(error.message || "?? ??????? ??????? Excel");
    }
}

function setupExcelButton() {
    elements.excelButton?.addEventListener("click", downloadExcel);
}

async function initReports() {
    const authenticated = await checkAuth();
    if (!authenticated) return;

    await loadReport("today");
    setupExcelButton();
}

initReports();