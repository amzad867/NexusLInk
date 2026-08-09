const express = require("express");
const { WebSocketServer } = require("ws");
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
// CONNECTED DEVICES
// =====================================================

let devices = {};


// =====================================================
// MESSAGE STORAGE
// =====================================================

let messages = [];


// =====================================================
// MAIN CONNECTION
// =====================================================

wss.on("connection", (ws) => {

    console.log(
        "Device Connected"
    );


    ws.on("message", (data) => {

        try {

            const message =
                JSON.parse(data);


            console.log(
                "Received:",
                message
            );



            // =================================================
            // REGISTER DEVICE
            // =================================================

            if (
                message.type === "register"
            ) {

                devices[message.deviceId] = {

                    socket: ws,

                    type: message.deviceType

                };


                console.log(
                    "Registered:",
                    message.deviceId,
                    message.deviceType
                );



                // =============================================
                // SEND PENDING TABLET MESSAGES
                // ONLY TO PHONE
                // =============================================

                if (
                    message.deviceType === "phone"
                ) {

                    messages.forEach((msg) => {

                        if (

                            msg.receiver ===
                            message.deviceId

                            &&

                            msg.status ===
                            "pending"

                        ) {

                            if (
                                ws.readyState === 1
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
                                    "Pending message sent:",
                                    msg.id
                                );

                            }

                        }

                    });

                }


            }






            // =================================================
            // TABLET MESSAGE
            // TABLET → PHONE ONLY
            // =================================================

            if (
                message.type ===
                "tablet_message"
            ) {


                const id =
                    crypto.randomUUID();



                const phoneID =
                    message.phoneID ||
                    "NXL-798D59";



                const newMessage = {

                    id: id,

                    sender:
                        message.deviceId ||
                        "tablet",

                    receiver:
                        phoneID,

                    message:
                        message.message || "",

                    status:
                        "pending",

                    time:
                        Date.now()

                };



                // =============================================
                // SAVE MESSAGE
                // =============================================

                messages.push(
                    newMessage
                );


                console.log(
                    "Message Saved:",
                    id
                );



                // =============================================
                // FIND PHONE
                // =============================================

                const phone =
                    devices[phoneID];



                if (

                    phone

                    &&

                    phone.type ===
                    "phone"

                    &&

                    phone.socket.readyState === 1

                ) {


                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "tablet_message",

                            messageId:
                                id,

                            message:
                                newMessage.message

                        })

                    );


                    console.log(
                        "Message sent to PHONE:",
                        phoneID
                    );


                }
                else {


                    console.log(
                        "Phone offline:",
                        phoneID
                    );


                }


            }






            // =================================================
            // TABLET STATUS
            //
            // TABLET → PHONE ONLY
            //
            // Contains:
            // latitude
            // longitude
            // battery
            // charging
            // =================================================

            if (
                message.type ===
                "tablet_status"
            ) {


                console.log(
                    "Tablet Status Received:",
                    message
                );



                const phoneID =
                    "NXL-798D59";



                const phone =
                    devices[phoneID];



                if (

                    phone

                    &&

                    phone.type ===
                    "phone"

                    &&

                    phone.socket.readyState === 1

                ) {


                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "tablet_status",

                            deviceId:
                                message.deviceId,

                            latitude:
                                message.latitude,

                            longitude:
                                message.longitude,

                            battery:
                                message.battery,

                            charging:
                                message.charging

                        })

                    );


                    console.log(
                        "Tablet status sent ONLY to phone:",
                        phoneID
                    );


                }
                else {


                    console.log(
                        "Phone offline. Tablet status not delivered."
                    );


                }


            }






            // =================================================
            // TABLET NOTIFICATION
            //
            // TABLET → PHONE ONLY
            // =================================================

            if (
                message.type ===
                "notification"
            ) {


                console.log(
                    "Tablet Notification Received"
                );



                const phoneID =
                    "NXL-798D59";



                const phone =
                    devices[phoneID];



                if (

                    phone

                    &&

                    phone.type ===
                    "phone"

                    &&

                    phone.socket.readyState === 1

                ) {


                    phone.socket.send(

                        JSON.stringify({

                            type:
                                "notification",

                            deviceId:
                                message.deviceId,

                            data:
                                message.data

                        })

                    );


                    console.log(
                        "Notification sent ONLY to phone:",
                        phoneID
                    );


                }
                else {


                    console.log(
                        "Phone offline. Notification not delivered."
                    );


                }


            }






            // =================================================
            // MESSAGE DELIVERY ACK
            // PHONE → SERVER
            // =================================================

            if (
                message.type ===
                "message_received"
            ) {


                const msg =
                    messages.find(

                        m =>
                            m.id ===
                            message.messageId

                    );



                if (msg) {


                    msg.status =
                        "delivered";


                    console.log(
                        "Message Delivered:",
                        msg.id
                    );


                }


            }


        }
        catch (error) {


            console.log(
                "Error:",
                error.message
            );


        }


    });






    // =====================================================
    // DEVICE DISCONNECTED
    // =====================================================

    ws.on("close", () => {


        console.log(
            "Device Disconnected"
        );



        for (
            const id in devices
        ) {


            if (
                devices[id].socket === ws
            ) {


                delete devices[id];


                console.log(
                    "Removed:",
                    id
                );


            }


        }


    });


});
