"use strict";

const TOKEN_KEY = "meat_accounting_access_token";

const form = document.getElementById("profile-form");
const displayNameInput = document.getElementById("display-name");
const usernameInput = document.getElementById("username");
const currentPasswordInput = document.getElementById("current-password");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const messageElement = document.getElementById("form-message");
const saveButton = document.getElementById("save-button");

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

async function request(url, options = {}) {
    const token = getToken();
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
        throw new Error("Сессия истекла. Войдите снова.");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось выполнить запрос");
    }

    return data;
}

function setMessage(text, success = false) {
    messageElement.textContent = text;
    messageElement.classList.toggle("success", success);
}

async function loadProfile() {
    if (!getToken()) {
        window.location.href = "/";
        return;
    }

    try {
        const profile = await request("/api/v1/auth/me");
        displayNameInput.value = profile.display_name || profile.username;
        usernameInput.value = profile.username;
    } catch (error) {
        setMessage(error.message);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const displayName = displayNameInput.value.trim();
    const username = usernameInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!displayName || !username) {
        setMessage("Заполните имя и логин.");
        return;
    }

    if (newPassword !== confirmPassword) {
        setMessage("Новые пароли не совпадают.");
        return;
    }

    if (newPassword && newPassword.length < 8) {
        setMessage("Новый пароль должен содержать не менее 8 символов.");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Сохранение...";

    try {
        const profile = await request("/api/v1/auth/profile", {
            method: "PATCH",
            body: JSON.stringify({
                display_name: displayName,
                username,
                current_password: currentPasswordInput.value,
                ...(newPassword ? { new_password: newPassword } : {}),
            }),
        });

        displayNameInput.value = profile.display_name;
        usernameInput.value = profile.username;
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        setMessage("Профиль успешно обновлён.", true);
    } catch (error) {
        setMessage(error.message);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Сохранить изменения";
    }
});

loadProfile();
