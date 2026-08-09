const express = require("express");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;


app.get("/", (req, res) => {

    res.send("Nexus Link Server Running");

});



const server = app.listen(PORT, () => {

    console.log(
        "Server running on port " + PORT
    );

});



const wss = new WebSocketServer({
    server
});



// Connected devices

let devices = {};


// Message storage

let messages = [];





wss.on("connection", (ws) => {


    console.log(
        "Device Connected"
    );



    ws.on("message", (data) => {


        try {


            let message = JSON.parse(data);



            console.log(
                "Received:",
                message
            );





            // =====================
            // REGISTER
            // =====================

            if(message.type === "register"){


                devices[message.deviceId] = {

                    socket: ws,

                    type: message.deviceType

                };



                console.log(
                    "Registered:",
                    message.deviceId,
                    message.deviceType
                );



                messages.forEach((msg)=>{


                    if(
                        msg.receiver === message.deviceId
                        &&
                        msg.status === "pending"
                    ){


                        ws.send(

                            JSON.stringify({

                                type:"tablet_message",

                                messageId:msg.id,

                                message:msg.message

                            })

                        );


                    }


                });


            }








            // =====================
            // TABLET MESSAGE
            // =====================


            if(message.type === "tablet_message"){



                let id =
                    crypto.randomUUID();




                let newMessage = {


                    id:id,

                    sender:"tablet",

                    receiver:message.phoneID,

                    message:message.message,

                    status:"pending",

                    time:Date.now()


                };



                messages.push(
                    newMessage
                );



                console.log(
                    "Message Saved:",
                    id
                );



                let phone =
                    devices[message.phoneID];



                if(phone){



                    phone.socket.send(

                        JSON.stringify({

                            type:"tablet_message",

                            messageId:id,

                            message:message.message

                        })

                    );



                    console.log(
                        "Delivery Attempt:",
                        id
                    );


                }

                else{


                    console.log(
                        "Phone offline:",
                        message.phoneID
                    );


                }


            }







            // ============================
            // TABLET LOCATION + BATTERY
            // ============================


            if(message.type === "tablet_status"){



                console.log(
                    "Tablet Status:",
                    message
                );



                for(let id in devices){



                    if(

                        id !== message.deviceId

                        &&

                        devices[id].socket.readyState === 1

                    ){



                        devices[id].socket.send(

                            JSON.stringify(message)

                        );



                        console.log(
                            "Tablet status sent:",
                            id
                        );


                    }


                }


            }








            // =====================
            // NOTIFICATION
            // =====================


            if(message.type === "notification"){



                for(let id in devices){



                    if(

                        id !== message.deviceId

                    ){



                        devices[id].socket.send(

                            JSON.stringify(message)

                        );



                        console.log(
                            "Notification sent:",
                            id
                        );


                    }


                }


            }









            // =====================
            // DELIVERY ACK
            // =====================


            if(message.type === "message_received"){



                let msg =

                    messages.find(

                        m =>
                        m.id === message.messageId

                    );



                if(msg){


                    msg.status =
                        "delivered";



                    console.log(
                        "Delivered:",
                        msg.id
                    );


                }


            }






        }

        catch(error){


            console.log(
                "Error:",
                error.message
            );


        }



    });







    ws.on("close",()=>{


        console.log(
            "Device Disconnected"
        );



        for(let id in devices){



            if(
                devices[id].socket === ws
            ){


                delete devices[id];



                console.log(
                    "Removed:",
                    id
                );


            }


        }


    });



});
