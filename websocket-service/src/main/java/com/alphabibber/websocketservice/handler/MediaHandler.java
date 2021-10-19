package com.alphabibber.websocketservice.handler;

import com.alphabibber.websocketservice.model.User;
import com.alphabibber.websocketservice.model.answer.MediaAnswer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.websocket.EncodeException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;

public class MediaHandler {
    private final Logger log = LoggerFactory.getLogger(this.getClass());
    public void handleMedia(Map<String, User> room, User sender, String media, Boolean event) {
        MediaAnswer answer;
        switch (media){
            case "video":
                sender.setVideo(event);
                answer = new MediaAnswer(sender.getId(), media, event);
                break;
            default:
                log.error("The media " + media + " is not known.");
                return;
        }

        ArrayList<User> users = new ArrayList<>(room.values());
        users.forEach(user -> {
            if (user.getId() == sender.getId()){return;}
            synchronized (user){
                try{
                    user.getSession().getBasicRemote().sendObject(answer);
                } catch (EncodeException | IOException e) {
                    log.error("Could not send media {} with event {} to user {}.", media, event, user.getId());
                }
            }
        });
    }
}
