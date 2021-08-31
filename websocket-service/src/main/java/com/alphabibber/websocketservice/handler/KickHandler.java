package com.alphabibber.websocketservice.handler;

import com.alphabibber.websocketservice.model.User;
import com.alphabibber.websocketservice.service.SpacesService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class KickHandler {
    private final Logger log = LoggerFactory.getLogger(this.getClass());
    private final LeaveHandler leaveHandler = new LeaveHandler();
    private final SpacesService spacesService = new SpacesService();

    public void handleKick(Map<String, User> room, String roomId, User sender, String token, String userId){
        if (!spacesService.isUserHost(roomId, token)){
            log.warn("User {} tried to kick another user for room {} but is no host for that room", sender.getId(), roomId);
        }
        // check if the user which should be kicked is part of the space
        if (!room.containsKey(userId)){
            log.warn("User {} was tried to be kicked but is not part of the room {}", userId, roomId);
        }
        User user = room.get(userId);
        leaveHandler.handleLeave(room, user);
    }
}