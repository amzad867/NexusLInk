const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// HTTP SERVER
// =====================================================

app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});

const server = app.listen(PORT, () => {
    console.log(
        "Server running on port " + PORT
    );
});

// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss = new WebSocketServer({
    server
});

// =====================================================
// DEVICES
// =====================================================

let devices = {};

// =====================================================
// MESSAGE STORAGE
// =====================================================

let messages = [];

// =====================================================
// HEARTBEAT SETTINGS
// =====================================================

const HEARTBEAT_INTERVAL = 30000;

// =====================================================
// DEVICE CONNECTION
// =====================================================

wss.on("connection", (ws) => {

    console.log("Device Connected");

    // -------------------------------------------------
    // HEARTBEAT STATE
    // -------------------------------------------------

    ws.isAlive = true;

    ws.on("pong", () => {

        ws.isAlive = true;

        console.log(
            "PONG RECEIVED"
        );
    });

    // =================================================
    // RECEIVE MESSAGE
    // =================================================

    ws.on("message", (data) => {

        try {

            const message =
                JSON.parse(data.toString());

            console.log(
                "Received:",
                message
            );

            // =============================================
            // REGISTER DEVICE
            // =============================================

            if (
                message.type === "register"
            ) {

                // If same device reconnects,
                // remove old socket first.

                const oldDevice =
                    devices[message.deviceId];

                if (
                    oldDevice &&
                    oldDevice.socket !== ws
                ) {

                    console.log(
                        "OLD SOCKET REPLACED:",
                        message.deviceId
                    );

                    try {
                        oldDevice.socket.terminate();
                    } catch (e) {
                        console.log(
                            "Old socket terminate error:",
                            e.message
                        );
                    }
                }

                devices[message.deviceId] = {

                    socket: ws,

                    type:
                        message.deviceType,

                    lastSeen:
                        Date.now()
                };

                ws.deviceId =
                    message.deviceId;

                ws.deviceType =
                    message.deviceType;

                console.log(
                    "REGISTERED DEVICE"
                );

                console.log(
                    "Device ID:",
                    message.deviceId
                );

                console.log(
                    "Device Type:",
                    message.deviceType
                );

                printOnlineDevices();

                // -----------------------------------------
                // SEND PENDING MESSAGES
                // -----------------------------------------

                messages.forEach(
                    (msg) => {

                        if (

                            msg.receiver ===
                                message.deviceId

                            &&

                            msg.status ===
                                "pending"

                        ) {

                            ws.send(

                                JSON.stringify({

                                    type:
                                        "tablet_message",

                                    messageId:
                                        msg.id,

                                    message:
                                        msg.message

                                })

                            );

                            console.log(
                                "Pending sent:",
                                msg.id
                            );
                        }
                    }
                );
            }

            // =============================================
            // TABLET MESSAGE
            // =============================================

            if (
                message.type ===
                "tablet_message"
            ) {

                const id =
                    crypto.randomUUID();

                const newMessage = {

                    id: id,

                    sender: "tablet",

                    receiver:
                        message.phoneID,

                    message:
                        message.message,

                    status: "pending",

                    time: Date.now()

                };

                messages.push(
                    newMessage
                );

                console.log(
                    "Message Saved:",
                    id
                );

                const phone =
                    devices[
                        message.phoneID
                    ];

                if (
                    phone &&
                    phone.socket.readyState ===
                        WebSocket.OPEN
                ) {

                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "tablet_message",

                            messageId:
                                id,

                            message:
                                message.message

                        })

                    );

                    console.log(
                        "Delivery Attempt:",
                        id
                    );

                }
                else {

                    console.log(
                        "Phone offline:",
                        message.phoneID
                    );
                }
            }

            // =============================================
            // PHONE REQUESTS TABLET LOCATION
            // =============================================

            if (
                message.type ===
                "location_request"
            ) {

                console.log(
                    "LOCATION REQUEST FROM PHONE:",
                    message
                );

                const phoneId =
                    message.phoneID;

                let tabletFound =
                    false;

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "tablet"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        tabletFound =
                            true;

                        device.socket.send(

                            JSON.stringify({

                                type:
                                    "location_request",

                                requestFrom:
                                    phoneId,

                                requestId:
                                    crypto.randomUUID()

                            })

                        );

                        console.log(
                            "LOCATION REQUEST SENT TO TABLET:",
                            id
                        );
                    }
                }

                if (
                    !tabletFound
                ) {

                    console.log(
                        "NO TABLET ONLINE"
                    );
                }
            }

            // =============================================
            // TABLET LOCATION + BATTERY STATUS
            // =============================================

            if (
                message.type ===
                "tablet_status"
            ) {

                console.log(
                    "Tablet Status:",
                    message
                );

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Tablet status sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // TABLET NOTIFICATION
            // =============================================

            if (
                message.type ===
                "notification"
            ) {

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Notification sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // MESSAGE DELIVERY ACK
            // =============================================

            if (
                message.type ===
                "message_received"
            ) {

                const msg =
                    messages.find(
                        (m) =>
                            m.id ===
                            message.messageId
                    );

                if (
                    msg
                ) {

                    msg.status =
                        "delivered";

                    console.log(
                        "Delivered:",
                        msg.id
                    );
                }
            }

        }
        catch (
            error
        ) {

            console.log(
                "Error:",
                error.message
            );
        }
    });

    // =================================================
    // DEVICE DISCONNECTED
    // =================================================

    ws.on(
        "close",
        () => {

            console.log(
                "Device Disconnected"
            );

            const deviceId =
                ws.deviceId;

            if (
                deviceId &&
                devices[deviceId] &&
                devices[deviceId].socket === ws
            ) {

                delete devices[deviceId];

                console.log(
                    "Removed:",
                    deviceId
                );

            }
            else {

                console.log(
                    "Disconnected socket was not found in devices"
                );
            }

            printOnlineDevices();
        }
    );

    // =================================================
    // SOCKET ERROR
    // =================================================

    ws.on(
        "error",
        (error) => {

            console.log(
                "SOCKET ERROR:",
                error.message
            );
        }
    );
});

// =====================================================
// HEARTBEAT CHECK
// =====================================================

const heartbeatTimer =
    setInterval(() => {

        console.log(
            "================ HEARTBEAT CHECK ================"
        );

        for (
            const id in devices
        ) {

            const device =
                devices[id];

            const socket =
                device.socket;

            if (
                socket.readyState !==
                WebSocket.OPEN
            ) {

                console.log(
                    "STALE SOCKET:",
                    id
                );

                try {
                    socket.terminate();
                } catch (e) {
                    console.log(
                        "Terminate error:",
                        e.message
                    );
                }

                continue;
            }

            if (
                socket.isAlive === false
            ) {

                console.log(
                    "DEVICE NOT RESPONDING:",
                    id
                );

                console.log(
                    "FORCING DISCONNECT:",
                    id
                );

                socket.terminate();

                continue;
            }

            socket.isAlive =
                false;

            socket.ping();

            console.log(
                "PING SENT:",
                id
            );
        }

        console.log(
            "================================================="
        );

    }, HEARTBEAT_INTERVAL);

// =====================================================
// CLEANUP HEARTBEAT
// =====================================================

wss.on(
    "close",
    () => {

        clearInterval(
            heartbeatTimer
        );
    }
);

// =====================================================
// PRINT ONLINE DEVICES
// =====================================================

function printOnlineDevices() {

    console.log(
        "Online Devices:"
    );

    let count = 0;

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        if (
            device.socket.readyState ===
            WebSocket.OPEN
        ) {

            console.log(
                "-",
                id,
                "(" +
                device.type +
                ")"
            );

            count++;
        }
    }

    if (
        count === 0
    ) {

        console.log(
            "- No devices online"
        );
    }

    console.log(
        "================================"
    );
}                    console.log(
                        "OLD SOCKET REPLACED:",
                        message.deviceId
                    );

                    try {
                        oldDevice.socket.terminate();
                    } catch (e) {
                        console.log(
                            "Old socket terminate error:",
                            e.message
                        );
                    }
                }

                devices[message.deviceId] = {

                    socket: ws,

                    type:
                        message.deviceType,

                    lastSeen:
                        Date.now()
                };

                ws.deviceId =
                    message.deviceId;

                ws.deviceType =
                    message.deviceType;

                console.log(
                    "REGISTERED DEVICE"
                );

                console.log(
                    "Device ID:",
                    message.deviceId
                );

                console.log(
                    "Device Type:",
                    message.deviceType
                );

                printOnlineDevices();

                // -----------------------------------------
                // SEND PENDING MESSAGES
                // -----------------------------------------

                messages.forEach(
                    (msg) => {

                        if (

                            msg.receiver ===
                                message.deviceId

                            &&

                            msg.status ===
                                "pending"

                        ) {

                            ws.send(

                                JSON.stringify({

                                    type:
                                        "tablet_message",

                                    messageId:
                                        msg.id,

                                    message:
                                        msg.message

                                })

                            );

                            console.log(
                                "Pending sent:",
                                msg.id
                            );
                        }
                    }
                );
            }

            // =============================================
            // TABLET MESSAGE
            // =============================================

            if (
                message.type ===
                "tablet_message"
            ) {

                const id =
                    crypto.randomUUID();

                const newMessage = {

                    id: id,

                    sender: "tablet",

                    receiver:
                        message.phoneID,

                    message:
                        message.message,

                    status: "pending",

                    time: Date.now()

                };

                messages.push(
                    newMessage
                );

                console.log(
                    "Message Saved:",
                    id
                );

                const phone =
                    devices[
                        message.phoneID
                    ];

                if (
                    phone &&
                    phone.socket.readyState ===
                        WebSocket.OPEN
                ) {

                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "tablet_message",

                            messageId:
                                id,

                            message:
                                message.message

                        })

                    );

                    console.log(
                        "Delivery Attempt:",
                        id
                    );

                }
                else {

                    console.log(
                        "Phone offline:",
                        message.phoneID
                    );
                }
            }

            // =============================================
            // PHONE REQUESTS TABLET LOCATION
            // =============================================

            if (
                message.type ===
                "location_request"
            ) {

                console.log(
                    "LOCATION REQUEST FROM PHONE:",
                    message
                );

                const phoneId =
                    message.phoneID;

                let tabletFound =
                    false;

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "tablet"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        tabletFound =
                            true;

                        device.socket.send(

                            JSON.stringify({

                                type:
                                    "location_request",

                                requestFrom:
                                    phoneId,

                                requestId:
                                    crypto.randomUUID()

                            })

                        );

                        console.log(
                            "LOCATION REQUEST SENT TO TABLET:",
                            id
                        );
                    }
                }

                if (
                    !tabletFound
                ) {

                    console.log(
                        "NO TABLET ONLINE"
                    );
                }
            }

            // =============================================
            // TABLET LOCATION + BATTERY STATUS
            // =============================================

            if (
                message.type ===
                "tablet_status"
            ) {

                console.log(
                    "Tablet Status:",
                    message
                );

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Tablet status sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // TABLET NOTIFICATION
            // =============================================

            if (
                message.type ===
                "notification"
            ) {

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Notification sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // MESSAGE DELIVERY ACK
            // =============================================

            if (
                message.type ===
                "message_received"
            ) {

                const msg =
                    messages.find(
                        (m) =>
                            m.id ===
                            message.messageId
                    );

                if (
                    msg
                ) {

                    msg.status =
                        "delivered";

                    console.log(
                        "Delivered:",
                        msg.id
                    );
                }
            }

        }
        catch (
            error
        ) {

            console.log(
                "Error:",
                error.message
            );
        }
    });

    // =================================================
    // DEVICE DISCONNECTED
    // =================================================

    ws.on(
        "close",
        () => {

            console.log(
                "Device Disconnected"
            );

            const deviceId =
                ws.deviceId;

            if (
                deviceId &&
                devices[deviceId] &&
                devices[deviceId].socket === ws
            ) {

                delete devices[deviceId];

                console.log(
                    "Removed:",
                    deviceId
                );

            }
            else {

                console.log(
                    "Disconnected socket was not found in devices"
                );
            }

            printOnlineDevices();
        }
    );

    // =================================================
    // SOCKET ERROR
    // =================================================

    ws.on(
        "error",
        (error) => {

            console.log(
                "SOCKET ERROR:",
                error.message
            );
        }
    );
});

// =====================================================
// HEARTBEAT CHECK
// =====================================================

const heartbeatTimer =
    setInterval(() => {

        console.log(
            "================ HEARTBEAT CHECK ================"
        );

        for (
            const id in devices
        ) {

            const device =
                devices[id];

            const socket =
                device.socket;

            if (
                socket.readyState !==
                WebSocket.OPEN
            ) {

                console.log(
                    "STALE SOCKET:",
                    id
                );

                try {
                    socket.terminate();
                } catch (e) {
                    console.log(
                        "Terminate error:",
                        e.message
                    );
                }

                continue;
            }

            if (
                socket.isAlive === false
            ) {

                console.log(
                    "DEVICE NOT RESPONDING:",
                    id
                );

                console.log(
                    "FORCING DISCONNECT:",
                    id
                );

                socket.terminate();

                continue;
            }

            socket.isAlive =
                false;

            socket.ping();

            console.log(
                "PING SENT:",
                id
            );
        }

        console.log(
            "================================================="
        );

    }, HEARTBEAT_INTERVAL);

// =====================================================
// CLEANUP HEARTBEAT
// =====================================================

wss.on(
    "close",
    () => {

        clearInterval(
            heartbeatTimer
        );
    }
);

// =====================================================
// PRINT ONLINE DEVICES
// =====================================================

function printOnlineDevices() {

    console.log(
        "Online Devices:"
    );

    let count = 0;

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        if (
            device.socket.readyState ===
            WebSocket.OPEN
        ) {

            console.log(
                "-",
                id,
                "(" +
                device.type +
                ")"
            );

            count++;
        }
    }

    if (
        count === 0
    ) {

        console.log(
            "- No devices online"
        );
    }

    console.log(
        "================================"
    );
}const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// HTTP SERVER
// =====================================================

app.get("/", (req, res) => {
    res.send("Nexus Link Server Running");
});

const server = app.listen(PORT, () => {
    console.log(
        "Server running on port " + PORT
    );
});

// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss = new WebSocketServer({
    server
});

// =====================================================
// DEVICES
// =====================================================

let devices = {};

// =====================================================
// MESSAGE STORAGE
// =====================================================

let messages = [];

// =====================================================
// HEARTBEAT SETTINGS
// =====================================================

const HEARTBEAT_INTERVAL = 30000;

// =====================================================
// DEVICE CONNECTION
// =====================================================

wss.on("connection", (ws) => {

    console.log("Device Connected");

    // -------------------------------------------------
    // HEARTBEAT STATE
    // -------------------------------------------------

    ws.isAlive = true;

    ws.on("pong", () => {

        ws.isAlive = true;

        console.log(
            "PONG RECEIVED"
        );
    });

    // =================================================
    // RECEIVE MESSAGE
    // =================================================

    ws.on("message", (data) => {

        try {

            const message =
                JSON.parse(data.toString());

            console.log(
                "Received:",
                message
            );

            // =============================================
            // REGISTER DEVICE
            // =============================================

            if (
                message.type === "register"
            ) {

                // If same device reconnects,
                // remove old socket first.

                const oldDevice =
                    devices[message.deviceId];

                if (
                    oldDevice &&
                    oldDevice.socket !== ws
                ) {

                    console.log(
                        "OLD SOCKET REPLACED:",
                        message.deviceId
                    );

                    try {
                        oldDevice.socket.terminate();
                    } catch (e) {
                        console.log(
                            "Old socket terminate error:",
                            e.message
                        );
                    }
                }

                devices[message.deviceId] = {

                    socket: ws,

                    type:
                        message.deviceType,

                    lastSeen:
                        Date.now()
                };

                ws.deviceId =
                    message.deviceId;

                ws.deviceType =
                    message.deviceType;

                console.log(
                    "REGISTERED DEVICE"
                );

                console.log(
                    "Device ID:",
                    message.deviceId
                );

                console.log(
                    "Device Type:",
                    message.deviceType
                );

                printOnlineDevices();

                // -----------------------------------------
                // SEND PENDING MESSAGES
                // -----------------------------------------

                messages.forEach(
                    (msg) => {

                        if (

                            msg.receiver ===
                                message.deviceId

                            &&

                            msg.status ===
                                "pending"

                        ) {

                            ws.send(

                                JSON.stringify({

                                    type:
                                        "tablet_message",

                                    messageId:
                                        msg.id,

                                    message:
                                        msg.message

                                })

                            );

                            console.log(
                                "Pending sent:",
                                msg.id
                            );
                        }
                    }
                );
            }

            // =============================================
            // TABLET MESSAGE
            // =============================================

            if (
                message.type ===
                "tablet_message"
            ) {

                const id =
                    crypto.randomUUID();

                const newMessage = {

                    id: id,

                    sender: "tablet",

                    receiver:
                        message.phoneID,

                    message:
                        message.message,

                    status: "pending",

                    time: Date.now()

                };

                messages.push(
                    newMessage
                );

                console.log(
                    "Message Saved:",
                    id
                );

                const phone =
                    devices[
                        message.phoneID
                    ];

                if (
                    phone &&
                    phone.socket.readyState ===
                        WebSocket.OPEN
                ) {

                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "tablet_message",

                            messageId:
                                id,

                            message:
                                message.message

                        })

                    );

                    console.log(
                        "Delivery Attempt:",
                        id
                    );

                }
                else {

                    console.log(
                        "Phone offline:",
                        message.phoneID
                    );
                }
            }

            // =============================================
            // PHONE REQUESTS TABLET LOCATION
            // =============================================

            if (
                message.type ===
                "location_request"
            ) {

                console.log(
                    "LOCATION REQUEST FROM PHONE:",
                    message
                );

                const phoneId =
                    message.phoneID;

                let tabletFound =
                    false;

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "tablet"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        tabletFound =
                            true;

                        device.socket.send(

                            JSON.stringify({

                                type:
                                    "location_request",

                                requestFrom:
                                    phoneId,

                                requestId:
                                    crypto.randomUUID()

                            })

                        );

                        console.log(
                            "LOCATION REQUEST SENT TO TABLET:",
                            id
                        );
                    }
                }

                if (
                    !tabletFound
                ) {

                    console.log(
                        "NO TABLET ONLINE"
                    );
                }
            }

            // =============================================
            // TABLET LOCATION + BATTERY STATUS
            // =============================================

            if (
                message.type ===
                "tablet_status"
            ) {

                console.log(
                    "Tablet Status:",
                    message
                );

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Tablet status sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // TABLET NOTIFICATION
            // =============================================

            if (
                message.type ===
                "notification"
            ) {

                for (
                    const id in devices
                ) {

                    const device =
                        devices[id];

                    if (

                        device.type ===
                            "phone"

                        &&

                        device.socket.readyState ===
                            WebSocket.OPEN

                    ) {

                        device.socket.send(

                            JSON.stringify(
                                message
                            )
                        );

                        console.log(
                            "Notification sent to phone:",
                            id
                        );
                    }
                }
            }

            // =============================================
            // MESSAGE DELIVERY ACK
            // =============================================

            if (
                message.type ===
                "message_received"
            ) {

                const msg =
                    messages.find(
                        (m) =>
                            m.id ===
                            message.messageId
                    );

                if (
                    msg
                ) {

                    msg.status =
                        "delivered";

                    console.log(
                        "Delivered:",
                        msg.id
                    );
                }
            }

        }
        catch (
            error
        ) {

            console.log(
                "Error:",
                error.message
            );
        }
    });

    // =================================================
    // DEVICE DISCONNECTED
    // =================================================

    ws.on(
        "close",
        () => {

            console.log(
                "Device Disconnected"
            );

            const deviceId =
                ws.deviceId;

            if (
                deviceId &&
                devices[deviceId] &&
                devices[deviceId].socket === ws
            ) {

                delete devices[deviceId];

                console.log(
                    "Removed:",
                    deviceId
                );

            }
            else {

                console.log(
                    "Disconnected socket was not found in devices"
                );
            }

            printOnlineDevices();
        }
    );

    // =================================================
    // SOCKET ERROR
    // =================================================

    ws.on(
        "error",
        (error) => {

            console.log(
                "SOCKET ERROR:",
                error.message
            );
        }
    );
});

// =====================================================
// HEARTBEAT CHECK
// =====================================================

const heartbeatTimer =
    setInterval(() => {

        console.log(
            "================ HEARTBEAT CHECK ================"
        );

        for (
            const id in devices
        ) {

            const device =
                devices[id];

            const socket =
                device.socket;

            if (
                socket.readyState !==
                WebSocket.OPEN
            ) {

                console.log(
                    "STALE SOCKET:",
                    id
                );

                try {
                    socket.terminate();
                } catch (e) {
                    console.log(
                        "Terminate error:",
                        e.message
                    );
                }

                continue;
            }

            if (
                socket.isAlive === false
            ) {

                console.log(
                    "DEVICE NOT RESPONDING:",
                    id
                );

                console.log(
                    "FORCING DISCONNECT:",
                    id
                );

                socket.terminate();

                continue;
            }

            socket.isAlive =
                false;

            socket.ping();

            console.log(
                "PING SENT:",
                id
            );
        }

        console.log(
            "================================================="
        );

    }, HEARTBEAT_INTERVAL);

// =====================================================
// CLEANUP HEARTBEAT
// =====================================================

wss.on(
    "close",
    () => {

        clearInterval(
            heartbeatTimer
        );
    }
);

// =====================================================
// PRINT ONLINE DEVICES
// =====================================================

function printOnlineDevices() {

    console.log(
        "Online Devices:"
    );

    let count = 0;

    for (
        const id in devices
    ) {

        const device =
            devices[id];

        if (
            device.socket.readyState ===
            WebSocket.OPEN
        ) {

            console.log(
                "-",
                id,
                "(" +
                device.type +
                ")"
            );

            count++;
        }
    }

    if (
        count === 0
    ) {

        console.log(
            "- No devices online"
        );
    }

    console.log(
        "================================"
    );
                            }
