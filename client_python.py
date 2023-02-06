import websocket
import _thread
import time
# import rel
import json
import threading
import uuid

CLIENT_ID = "python_client_" + str(uuid.uuid4())

def send_own_id(ws):
    
    message_str = "client_id: " + CLIENT_ID
    ws.send(message_str)


def on_message(ws, message):
    # all messages from server are strings which contain JSON
    # print("Received new message: ", message)
    message_dict = json.loads(message)
    if message_dict["type"] == "message":
        print("{} hat geschrieben: {}".format(message_dict["nickname"], message_dict["message"]))
    elif message_dict["type"] == "nick_update":
        print("Ein Benutzer hat seinen Nicknamen geändert: {}".format(message_dict["message"]))
    else:
        print(message_dict["message"])


def on_error(ws, error):
    print("Fehler ist aufgetreten:", error)

def on_close(ws, close_status_code, close_msg):
    print("### closed ###")

def on_open(ws):
    print("Opened connection")
    send_own_id(ws)
    thread = threading.Thread(target=wait_for_input_from_user, args=[ws])
    thread.start()

def wait_for_input_from_user(ws):
    run = True
    while run:
        user_input = input()
        if user_input == "exit":
            run = False
            break
        ws.send(user_input)

if __name__ == "__main__":
    # websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://renyideAir:8181",
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    # ws.run_forever(dispatcher=rel, reconnect=5)  # Set dispatcher to automatic reconnection, 5 second reconnect delay if connection closed unexpectedly
    
    # rel.signal(2, rel.abort)  # Keyboard Interrupt
    # rel.dispatch()

    ws.run_forever(reconnect=5) 

    