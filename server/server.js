const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({
    port: PORT
});

const devices = new Map();

console.log("Nexus Link WebSocket server starting...");

function send(ws, data) {
    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify(data)
        );
    }
}

function getDevice(deviceId) {
    return devices.get(deviceId);
}

function getTablet() {

    for (const device of devices.values()) {

        if (
            device.deviceType === "tablet"
        ) {
            return device;
        }
    }

    return null;
}

function getPhone() {

    for (const device of devices.values()) {

        if (
            device.deviceType === "phone"
        ) {
            return device;
        }
    }

    return null;
}

function relayToTablet(
    message,
    targetDeviceId
) {

    let tablet =
        targetDeviceId
            ? getDevice(targetDeviceId)
            : getTablet();

    if (
        !tablet ||
        tablet.ws.readyState !== WebSocket.OPEN
    ) {

        return false;
    }

    send(
        tablet.ws,
        message
    );

    return true;
}

function relayToPhone(
    message
) {

    const phone =
        getPhone();

    if (
        !phone ||
        phone.ws.readyState !== WebSocket.OPEN
    ) {

        return false;
    }

    send(
        phone.ws,
        message
    );

    return true;
}

wss.on(
    "connection",
    function connection(ws) {

        console.log(
            "Client connected"
        );

        ws.deviceId = null;
        ws.deviceType = null;

        ws.on(
            "message",
            function incoming(raw) {

                let message;

                try {

                    message =
                        JSON.parse(
                            raw.toString()
                        );

                }
                catch (error) {

                    console.log(
                        "Invalid JSON"
                    );

                    return;
                }

                const type =
                    message.type;

                // =================================================
                // REGISTER
                // =================================================

                if (
                    type === "register"
                ) {

                    const deviceId =
                        message.deviceId;

                    const deviceType =
                        message.deviceType;

                    if (
                        !deviceId ||
                        !deviceType
                    ) {

                        return;
                    }

                    ws.deviceId =
                        deviceId;

                    ws.deviceType =
                        deviceType;

                    devices.set(
                        deviceId,
                        {
                            ws,
                            deviceId,
                            deviceType
                        }
                    );

                    console.log(
                        "REGISTER:",
                        deviceId,
                        deviceType
                    );

                    // Phone gets currently available tablet
                    if (
                        deviceType === "phone"
                    ) {

                        const tablet =
                            getTablet();

                        if (tablet) {

                            send(
                                ws,
                                {
                                    type:
                                        "paired_tablet",

                                    tabletId:
                                        tablet.deviceId
                                }
                            );
                        }
                    }

                    // Tablet gets currently available phone
                    if (
                        deviceType === "tablet"
                    ) {

                        const phone =
                            getPhone();

                        if (phone) {

                            send(
                                phone.ws,
                                {
                                    type:
                                        "paired_tablet",

                                    tabletId:
                                        deviceId
                                }
                            );
                        }
                    }

                    return;
                }

                // =================================================
                // LOCATION REQUEST
                // =================================================

                if (
                    type ===
                    "location_request"
                ) {

                    const target =
                        message.targetDeviceId;

                    const success =
                        relayToTablet(
                            message,
                            target
                        );

                    console.log(
                        "LOCATION REQUEST:",
                        success
                    );

                    return;
                }

                // =================================================
                // SCREEN REQUEST
                // =================================================

                if (
                    type ===
                    "screen_request"
                ) {

                    const target =
                        message.targetDeviceId;

                    const success =
                        relayToTablet(
                            message,
                            target
                        );

                    console.log(
                        "SCREEN REQUEST:",
                        success
                    );

                    return;
                }

                // =================================================
                // CAMERA REQUEST
                // =================================================

                if (
                    type ===
                    "camera_request"
                ) {

                    const target =
                        message.targetDeviceId;

                    const success =
                        relayToTablet(
                            message,
                            target
                        );

                    console.log(
                        "CAMERA REQUEST:",
                        success
                    );

                    return;
                }

                // =================================================
                // TABLET STATUS
                // =================================================

                if (
                    type ===
                    "tablet_status"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // SCREEN FRAME
                // =================================================

                if (
                    type ===
                    "screen_frame"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // SCREEN STARTED
                // =================================================

                if (
                    type ===
                    "screen_started"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // SCREEN STOPPED
                // =================================================

                if (
                    type ===
                    "screen_stopped"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // SCREEN ERROR
                // =================================================

                if (
                    type ===
                    "screen_error"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // CAMERA FRAME
                // =================================================

                if (
                    type ===
                    "camera_frame"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // CAMERA STARTED
                // =================================================

                if (
                    type ===
                    "camera_started"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // CAMERA STOPPED
                // =================================================

                if (
                    type ===
                    "camera_stopped"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // CAMERA ERROR
                // =================================================

                if (
                    type ===
                    "camera_error"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // NOTIFICATION
                // =================================================

                if (
                    type ===
                    "notification"
                ) {

                    relayToPhone(
                        message
                    );

                    return;
                }

                // =================================================
                // MESSAGE ACK
                // =================================================

                if (
                    type ===
                    "message_received"
                ) {

                    console.log(
                        "MESSAGE ACK:",
                        message.messageId
                    );

                    return;
                }
            }
        );

        ws.on(
            "close",
            function () {

                if (
                    ws.deviceId
                ) {

                    const current =
                        devices.get(
                            ws.deviceId
                        );

                    if (
                        current &&
                        current.ws === ws
                    ) {

                        devices.delete(
                            ws.deviceId
                        );
                    }

                    console.log(
                        "DISCONNECTED:",
                        ws.deviceId
                    );
                }
            }
        );

        ws.on(
            "error",
            function (error) {

                console.log(
                    "WebSocket error:",
                    error.message
                );
            }
        );
    }
);

wss.on(
    "listening",
    function () {

        const address =
            wss.address();

        console.log(
            "Nexus Link server running on port",
            address.port
        );
    }
);
