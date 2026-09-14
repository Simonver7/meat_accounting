"use strict";

/*
 * ============================================================
 * REPORTS
 * ============================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* ====================================================
           CONFIG
        ==================================================== */

        const TOKEN_KEY =
            "meat_accounting_access_token";

        const OPERATIONS_API =
            "/api/v1/operations?limit=500";

        /*
         * Возможные Excel endpoints.
         *
         * Первый используется основным.
         */
        const EXCEL_ENDPOINTS = [
            "/api/v1/reports/excel",
            "/api/v1/exports/excel"
        ];


        /* ====================================================
           ELEMENTS
        ==================================================== */

        const openingStock =
            document.getElementById(
                "opening-stock"
            );

        const incomingValue =
            document.getElementById(
                "incoming-value"
            );

        const spitValue =
            document.getElementById(
                "spit-value"
            );

        const closingStock =
            document.getElementById(
                "closing-stock"
            );

        const reportStatus =
            document.getElementById(
                "report-status"
            );

        const reportDate =
            document.getElementById(
                "report-date"
            );

        const lastUpdate =
            document.getElementById(
                "last-update"
            );

        const reportError =
            document.getElementById(
                "report-error"
            );

        const errorMessage =
            document.getElementById(
                "error-message"
            );

        const retryButton =
            document.getElementById(
                "retry-button"
            );

        const excelButton =
            document.getElementById(
                "excel-button"
            );

        const backButton =
            document.getElementById(
                "back-button"
            );

        const toast =
            document.getElementById(
                "toast"
            );


        /* ====================================================
           HELPERS
        ==================================================== */

        function getToken() {
            return localStorage.getItem(
                TOKEN_KEY
            );
        }


        function formatKg(value) {

            const number =
                Number(value) || 0;

            return number
                .toFixed(1)
                .replace(
                    ".0",
                    ""
                );
        }


        function formatSigned(value) {

            const number =
                Number(value) || 0;

            if (number === 0) {
                return "+0";
            }

            if (number > 0) {
                return `+${formatKg(number)}`;
            }

            return `−${formatKg(
                Math.abs(number)
            )}`;
        }


        function showToast(message) {

            if (!toast) {
                return;
            }

            toast.textContent =
                message;

            toast.classList.add(
                "visible"
            );

            clearTimeout(
                showToast.timer
            );

            showToast.timer =
                setTimeout(
                    () => {
                        toast.classList.remove(
                            "visible"
                        );
                    },
                    3000
                );
        }


        function getTodayKey() {

            const now =
                new Date();

            const year =
                now.getFullYear();

            const month =
                String(
                    now.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    now.getDate()
                ).padStart(2, "0");

            return `${year}-${month}-${day}`;
        }


        function getDateFromOperation(
            operation
        ) {

            return (
                operation?.operation_date ??
                operation?.date ??
                operation?.created_at ??
                operation?.createdAt ??
                null
            );
        }


        function getDateKey(
            value
        ) {

            if (!value) {
                return null;
            }


            /*
             * Если backend уже вернул
             * YYYY-MM-DD.
             */

            if (
                typeof value === "string" &&
                /^\d{4}-\d{2}-\d{2}$/
                    .test(value)
            ) {
                return value;
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return null;
            }


            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");


            return `${year}-${month}-${day}`;
        }


        function getOperationsArray(
            data
        ) {

            if (
                Array.isArray(data)
            ) {
                return data;
            }


            if (
                Array.isArray(
                    data?.items
                )
            ) {
                return data.items;
            }


            if (
                Array.isArray(
                    data?.operations
                )
            ) {
                return data.operations;
            }


            if (
                Array.isArray(
                    data?.data
                )
            ) {
                return data.data;
            }


            return [];
        }


        function getOperationType(
            operation
        ) {

            return String(
                operation?.type ??
                operation?.operation_type ??
                operation?.operation ??
                ""
            )
                .toUpperCase()
                .trim();
        }


        function getMeatType(
            operation
        ) {

            return String(
                operation?.meat_type ??
                operation?.meat ??
                operation?.product_type ??
                ""
            )
                .toUpperCase()
                .trim();
        }


        function getQuantity(
            operation
        ) {

            return Number(
                operation?.quantity ??
                operation?.amount ??
                operation?.weight ??
                operation?.kg ??
                0
            );
        }


        /* ====================================================
           AUTH FETCH
        ==================================================== */

        async function apiFetch(
            url
        ) {

            const token =
                getToken();


            if (!token) {

                window.location.href =
                    "/login";

                throw new Error(
                    "Токен отсутствует"
                );
            }


            const response =
                await fetch(
                    url,
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );


            if (
                response.status === 401
            ) {

                localStorage.removeItem(
                    TOKEN_KEY
                );

                window.location.href =
                    "/login";

                throw new Error(
                    "Сессия истекла"
                );
            }


            if (!response.ok) {

                const text =
                    await response.text();

                throw new Error(
                    `HTTP ${response.status}: ${text}`
                );
            }


            return response.json();
        }


        /* ====================================================
           TODAY
        ==================================================== */

        function isToday(
            operation
        ) {

            const value =
                getDateFromOperation(
                    operation
                );


            /*
             * Если backend не прислал дату,
             * считаем операцию сегодняшней.
             *
             * Это помогает с API,
             * которое возвращает только created_at.
             */

            if (!value) {
                return true;
            }


            const key =
                getDateKey(value);


            return key ===
                getTodayKey();
        }


        /* ====================================================
           SKIN
        ==================================================== */

        function isSkin(
            operation
        ) {

            const meat =
                getMeatType(
                    operation
                );


            /*
             * В Figma текущий отчёт —
             * "С кожей".
             *
             * Если backend вообще не
             * передал meat_type, не отбрасываем
             * операцию.
             */

            if (!meat) {
                return true;
            }


            return (
                meat === "SKIN" ||
                meat === "WITH_SKIN" ||
                meat === "С КОЖЕЙ" ||
                meat.includes("SKIN")
            );
        }


        /* ====================================================
           REPORT CALCULATION
        ==================================================== */

        function calculateReport(
            operations
        ) {

            let incoming = 0;

            let spit = 0;

            let netToday = 0;


            for (
                const operation
                of operations
            ) {

                if (!isToday(operation)) {
                    continue;
                }


                if (!isSkin(operation)) {
                    continue;
                }


                const type =
                    getOperationType(
                        operation
                    );


                const quantity =
                    Math.abs(
                        getQuantity(
                            operation
                        )
                    );


                /*
                 * Отменённые операции
                 * не участвуют в отчёте.
                 */

                const status =
                    String(
                        operation?.status ??
                        ""
                    )
                        .toUpperCase()
                        .trim();


                if (
                    status ===
                    "CANCELLED"
                ) {
                    continue;
                }


                /* --------------------------------------------
                   INCOMING
                -------------------------------------------- */

                if (
                    type === "INCOMING" ||
                    type === "INCOME" ||
                    type === "ARRIVAL" ||
                    type === "RECEIPT"
                ) {

                    incoming +=
                        quantity;

                    netToday +=
                        quantity;

                    continue;
                }


                /* --------------------------------------------
                   SPIT
                -------------------------------------------- */

                if (
                    type === "SPIT" ||
                    type === "VERTEL"
                ) {

                    spit +=
                        quantity;

                    netToday -=
                        quantity;

                    continue;
                }


                /*
                 * Другие списания тоже уменьшают
                 * остаток, но в этом конкретном
                 * Figma отчёте мы их не показываем.
                 */

                if (
                    type === "WRITE_OFF" ||
                    type === "CONVECTION" ||
                    type === "FRANCHISE"
                ) {

                    netToday -=
                        quantity;
                }
            }


            return {
                incoming,
                spit,
                netToday
            };
        }


        /* ====================================================
           CURRENT STOCK
        ==================================================== */

        async function getCurrentStock() {

            /*
             * Берём остаток из dashboard API.
             */

            const data =
                await apiFetch(
                    "/api/v1/stock"
                );


            const skin =
                Number(
                    data?.skin ??
                    data?.skin_stock ??
                    data?.SKIN ??
                    data?.with_skin ??
                    0
                );


            return skin;
        }


        /* ====================================================
           RENDER
        ==================================================== */

        function renderReport(
            report,
            currentStock
        ) {

            /*
             * Конечный остаток берём
             * непосредственно из stock API.
             */

            const closing =
                Number(
                    currentStock
                ) || 0;


            /*
             * На начало =
             *
             * конец
             * - приход
             * + вертель
             *
             * То есть:
             *
             * opening =
             * closing - incoming + spit
             */

            const opening =
                closing -
                report.incoming +
                report.spit;


            openingStock.textContent =
                formatKg(opening);


            incomingValue.textContent =
                formatSigned(
                    report.incoming
                );


            spitValue.textContent =
                report.spit === 0
                    ? "−0"
                    : `−${formatKg(
                        report.spit
                    )}`;


            closingStock.textContent =
                formatKg(closing);


            reportStatus.textContent =
                "Готово";


            reportStatus.style.color =
                "#a1a1a1";


            lastUpdate.textContent =
                `Обновлено ${new Date()
                    .toLocaleTimeString(
                        "ru-RU",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )}`;
        }


        /* ====================================================
           LOAD REPORT
        ==================================================== */

        async function loadReport() {

            reportError.hidden =
                true;


            reportStatus.textContent =
                "Загрузка...";


            openingStock.textContent =
                "—";


            incomingValue.textContent =
                "+0";


            spitValue.textContent =
                "−0";


            closingStock.textContent =
                "—";


            try {

                const [
                    operationsData,
                    currentStock
                ] =
                    await Promise.all([
                        apiFetch(
                            OPERATIONS_API
                        ),

                        getCurrentStock()
                    ]);


                const operations =
                    getOperationsArray(
                        operationsData
                    );


                const report =
                    calculateReport(
                        operations
                    );


                renderReport(
                    report,
                    currentStock
                );


            } catch (error) {

                console.error(
                    "Reports error:",
                    error
                );


                reportStatus.textContent =
                    "Ошибка";


                reportError.hidden =
                    false;


                errorMessage.textContent =
                    error.message ||
                    "Не удалось загрузить данные";


                lastUpdate.textContent =
                    "Данные не загружены";
            }
        }


        /* ====================================================
           EXCEL
        ==================================================== */

        async function downloadExcel() {

            const token =
                getToken();


            if (!token) {

                window.location.href =
                    "/login";

                return;
            }


            excelButton.disabled =
                true;


            const originalText =
                excelButton.innerHTML;


            excelButton.innerHTML =
                "Подготовка файла...";


            try {

                let downloaded =
                    false;


                for (
                    const endpoint
                    of EXCEL_ENDPOINTS
                ) {

                    try {

                        const response =
                            await fetch(
                                endpoint,
                                {
                                    method: "GET",

                                    headers: {
                                        "Authorization":
                                            `Bearer ${token}`
                                    }
                                }
                            );


                        if (
                            !response.ok
                        ) {
                            continue;
                        }


                        const blob =
                            await response.blob();


                        const url =
                            URL.createObjectURL(
                                blob
                            );


                        const link =
                            document.createElement(
                                "a"
                            );


                        link.href =
                            url;


                        link.download =
                            `otchet-${getTodayKey()}.xlsx`;


                        document.body.appendChild(
                            link
                        );


                        link.click();


                        link.remove();


                        URL.revokeObjectURL(
                            url
                        );


                        downloaded =
                            true;


                        break;

                    } catch (
                        endpointError
                    ) {

                        console.warn(
                            "Excel endpoint error:",
                            endpoint,
                            endpointError
                        );
                    }
                }


                if (!downloaded) {

                    throw new Error(
                        "Excel endpoint недоступен"
                    );
                }


                showToast(
                    "Excel-файл скачивается"
                );


            } catch (error) {

                console.error(
                    "Excel error:",
                    error
                );


                showToast(
                    "Не удалось скачать Excel"
                );

            } finally {

                excelButton.disabled =
                    false;

                excelButton.innerHTML =
                    originalText;
            }
        }


        /* ====================================================
           DATE
        ==================================================== */

        function renderDate() {

            const now =
                new Date();


            reportDate.textContent =
                now.toLocaleDateString(
                    "ru-RU",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );
        }


        /* ====================================================
           EVENTS
        ==================================================== */

        retryButton?.addEventListener(
            "click",
            () => {
                loadReport();
            }
        );


        excelButton?.addEventListener(
            "click",
            () => {
                downloadExcel();
            }
        );


        backButton?.addEventListener(
            "click",
            () => {

                if (
                    document.referrer &&
                    document.referrer.includes(
                        window.location.host
                    )
                ) {

                    window.history.back();

                } else {

                    window.location.href =
                        "/dashboard";
                }
            }
        );


        /* ====================================================
           INIT
        ==================================================== */

        renderDate();

        loadReport();
    }
);