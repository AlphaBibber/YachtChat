package com.alphabibber.websocketservice.handler;

import com.alphabibber.websocketservice.model.User;
import com.alphabibber.websocketservice.model.answer.LoginAnswer;
import com.alphabibber.websocketservice.model.answer.NewUserAnswer;
import com.alphabibber.websocketservice.service.PosthogService;
import com.alphabibber.websocketservice.service.SpacesService;
import com.alphabibber.websocketservice.service.PosthogService;
import net.minidev.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.websocket.EncodeException;
import javax.websocket.Session;
import java.io.IOException;
import java.net.http.HttpClient;
import java.util.*;

public class LoginHandler {
    private final SpacesService spacesService = new SpacesService();
    private final String URL = System.getenv("SPACES_URL");
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .build();
    private final Logger log = LoggerFactory.getLogger(this.getClass());
    private final LeaveHandler leaveHandler = new LeaveHandler();
    private final PosthogService posthogService = PosthogService.getInstance();

    public void handleLogin(Map<String, User> room, String roomId, String token, String userId, Session session, boolean video, boolean microphone) {
        if (userId.equals("-1")){
            log.error("{}: User tried to login with invalid ID", userId);
            return;
        }

        if (!spacesService.isUserAllowedToJoin(roomId, token)) {
            // if the user is not allowed to enter the room the websocket connection will be closed
            try {
                LoginAnswer deniedAnswer = new LoginAnswer(false, new HashSet<User>(), userId);
                session.getBasicRemote().sendObject(deniedAnswer);
                session.close();
            } catch (IOException | EncodeException e) {
                log.error("{}: Deniedanswer could not be sent to user", userId);
                log.error(String.valueOf(e.getStackTrace()));
                return;
            }

            log.error("{}: User tried to login in space for which he is not allowed", userId);
            return;
        }
        // check if a user with the given userId is already part of this room
        for (User user:room.values()){
            if (user.getId().equals(userId)){
                // kick this user that was already in the space
                log.info("{}: Tried to login while already being in the space {}", userId, roomId);
                leaveHandler.handleLeave(roomId, room, user);
            }
        }

        // user is allowed to log in
        User user = new User(session, userId, video, microphone);
        room.put(session.getId(), user);

        // tell the user that he was added to the room
        LoginAnswer loginAnswer = new LoginAnswer(true, new HashSet<>(room.values()), userId);

        // handle all the posthog tracking
       posthogService.handleLogin(user, roomId, room);

        try {
            session.getBasicRemote().sendObject(loginAnswer);
        } catch (EncodeException | IOException e) {
          log.error("{}: Could not send Loginmessage", userId);
          log.error(String.valueOf(e.getStackTrace()));
        }
        log.info("{}: User is now part of room {}", userId, roomId);

        // tell all other users that a new User joined
        NewUserAnswer newUserAnswer = new NewUserAnswer(user.getId(), user.getPosition(), video, microphone);
        ArrayList<User> users = new ArrayList<>(room.values());
        // this should only skip this iteration
        users.stream().filter(target -> !target.getId().equals(user.getId())).forEach(target -> {
            synchronized (target) {
                try {
                    target.getSession().getBasicRemote().sendObject(newUserAnswer);
                } catch (EncodeException | IOException e) {
                    log.error("{}: Could not send NewUserMessage", target.getId());
                }
            }
        });
    }
}
