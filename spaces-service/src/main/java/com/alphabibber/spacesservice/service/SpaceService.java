package com.alphabibber.spacesservice.service;

import com.alphabibber.spacesservice.model.Space;
import com.alphabibber.spacesservice.model.SpaceHost;
import com.alphabibber.spacesservice.model.SpaceMember;
import com.alphabibber.spacesservice.model.User;
import com.alphabibber.spacesservice.repository.SpaceHostRepository;
import com.alphabibber.spacesservice.repository.SpaceMemberRepository;
import com.alphabibber.spacesservice.repository.SpaceRepository;
import com.alphabibber.spacesservice.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.keycloak.KeycloakSecurityContext;
import org.keycloak.adapters.springsecurity.token.KeycloakAuthenticationToken;
import org.keycloak.representations.AccessToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import javax.persistence.EntityNotFoundException;
import java.security.Principal;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class SpaceService {

    private final SpaceRepository spaceRepository;
    private final UserRepository userRepository;
    private final SpaceHostRepository spaceHostRepository;
    private final SpaceMemberRepository spaceMemberRepository;
    private final UserService userService;

    @Autowired
    public SpaceService(
            SpaceRepository spaceRepository,
            UserRepository userRepository,
            SpaceHostRepository spaceHostRepository,
            SpaceMemberRepository spaceMemberRepository,
            UserService userService
    ) {
        this.spaceRepository = spaceRepository;
        this.userRepository = userRepository;
        this.spaceHostRepository = spaceHostRepository;
        this.userService = userService;
        this.spaceMemberRepository = spaceMemberRepository;
    }

    public Set<Space> getSpaces() {
        Principal principal = SecurityContextHolder.getContext().getAuthentication();

        boolean isNotAnonymousUser = ((KeycloakAuthenticationToken) principal).getAuthorities().stream().noneMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_ANONYMOUS"));

        if (isNotAnonymousUser) {
            var user = userService.getContextUserIfExistsElseCreate();

            var result = new HashSet<Space>();

            user.getHostSpaces().forEach(spaceHost ->
                    result.addAll(spaceRepository.findAllBySpaceHostsContains(spaceHost))
            );
            user.getMemberSpaces().forEach(spaceMember ->
                    result.addAll(spaceRepository.findAllBySpaceMembersContains(spaceMember))
            );
            result.addAll(spaceRepository.findAllByPublicAccessIsTrue());

            // after data migration we need to have this code here checking for null in the largeSpace attribute
            for(Space space : result) {
                if(space.isLargeSpace() == null) {
                    space.setLargeSpace(false);
                }
            }

            // check if the user has at least one space if not create his "<Username's> First Space"
            if (result.isEmpty()) {
                AccessToken accessToken = ((KeycloakAuthenticationToken) principal).getAccount()
                        .getKeycloakSecurityContext().getToken();
                Space starterSpace = createSpace(new Space(accessToken.getGivenName() + "'s Space", false));
                result.add(starterSpace);
            }

            return result;
        }

        throw new AccessDeniedException("User is not authenticated");
    }

    public Space createSpace(Space spaceDTO) {
        String spaceName = spaceDTO.getName();
        boolean isLarge = spaceDTO.isLargeSpace();
        // Boolean publicAccess = spaceDTO.isPublic() != null ? spaceDTO.isPublic() : false;
        // initial save to set id
        // publicAccess should always be set to false
        var space = spaceRepository.save(new Space(spaceName, isLarge));

        // assumption: Space does not contain spaceHosts or spaceMembers after init
        var user = userService.getContextUserIfExistsElseCreate();

        var spaceHost = new SpaceHost(user, space);
        var spaceMember = new SpaceMember(user, space);

        user.addHostSpace(spaceHost);
        user.addMemberSpace(spaceMember);

        space.addSpaceHost(spaceHost);
        space.addSpaceMember(spaceMember);

        // order matters here!
        userRepository.save(user);
        space = spaceRepository.save(space);
        spaceHostRepository.save(spaceHost);
        spaceMemberRepository.save(spaceMember);

        return space;
    }

    public void saveSpace(Space space) {
        spaceRepository.save(space);
    }

    public Space getSpaceById(String id) {
        Optional<Space> spaceResult = spaceRepository.findById(id);

        if (spaceResult.isEmpty())
                throw new EntityNotFoundException("Space not Found");

        var space = spaceResult.get();
        var user = userService.getContextUserIfExistsElseCreate();

        boolean userIsUserInSpace = space.getAllUsers().contains(user);

        if (!userIsUserInSpace && !space.isPublic())
            throw new AccessDeniedException("Not user in space");

        return space;
    }

    public void deleteSpaceById(String id) throws AccessDeniedException {
        var spaceToDelete = spaceRepository.getOne(id);
        var user = userService.getContextUserIfExistsElseCreate();

        boolean userIsNotHostInSpace = Collections.disjoint(spaceToDelete.getSpaceHosts(), user.getHostSpaces());

        if (userIsNotHostInSpace)
            throw new AccessDeniedException("Not host of space");

        spaceRepository.delete(spaceToDelete);
    }

    public Space addSpaceMember(Space space, User member) {
        var spaceMember = new SpaceMember(member, space);
        member.addMemberSpace(spaceMember);
        space.addSpaceMember(spaceMember);

        // order matters here!
        userRepository.save(member);
        space = spaceRepository.save(space);
        spaceMemberRepository.save(spaceMember);

        return space;
    }

    public Space addSpaceMemberWithContextUser(String spaceId, String memberId) {
        var space = this.getSpaceById(spaceId);
        var invitor = userService.getContextUserIfExistsElseCreate();

        var member = userService.getUserById(memberId);

        boolean userIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), invitor.getHostSpaces());

        if (userIsNotHostInSpace && !space.isPublic())
            throw new AccessDeniedException("Not host of space");

        if (space.isPublic() && !memberId.equals(invitor.getId()))
            throw new AccessDeniedException("You can only add yourself to public spaces");

        boolean inviteeNotYetMember = Collections.disjoint(space.getSpaceMembers(), member.getMemberSpaces());

        if (inviteeNotYetMember) {
            return addSpaceMember(space, member);
        }

        return space;
    }

    public Space getSpaceByIdWithJwtHostId(String id) {
        Optional<Space> spaceResult = spaceRepository.findById(id);

        if (spaceResult.isEmpty())
            throw new EntityNotFoundException("Space not Found");

        return spaceResult.get();
    }

    public Space addSpaceMemberWithJwtClaims(Claims claims) {
        var invitorId = claims.getSubject();
        var invitor = userService.getUserById(invitorId);

        var spaceId = (String) claims.get("space");
        var space = getSpaceByIdWithJwtHostId(spaceId);

        boolean userIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), invitor.getHostSpaces());
        assert !userIsNotHostInSpace;

        var invitee = userService.getContextUserIfExistsElseCreate();

        return addSpaceMember(space, invitee);
    }

    private Space removeNormalSpaceMember(Space space, User toBeKicked) {
        var spaceMember = spaceMemberRepository.findSpaceMemberBySpaceIsAndMemberIs(space, toBeKicked);

        toBeKicked.removeMemberSpace(spaceMember);
        space.removeSpaceMember(spaceMember);

        userRepository.save(toBeKicked);
        space = spaceRepository.save(space);
        spaceMemberRepository.delete(spaceMember);
        return space;
    }

    private Space removeUserTriggeredBySomeoneElse(User remover, User toBeKicked, Space space) {
        var removerIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), remover.getHostSpaces());
        var memberToBeRemovedIsHost = !Collections.disjoint(space.getSpaceHosts(), toBeKicked.getHostSpaces());

        if (removerIsNotHostInSpace)
            throw new AccessDeniedException("Not host of space. Only hosts can remove other members.");
        if (space.isPublic())
            throw new AccessDeniedException("Not allowed to kick User from the public space");
        if (memberToBeRemovedIsHost)
            throw new AccessDeniedException("You cannot remove a host from a space");
         return removeNormalSpaceMember(space, toBeKicked);
    }

    private Space removeUserTriggeredByHimself(User user, Space space){
        boolean userIsHostInSpace = !Collections.disjoint(space.getSpaceHosts(), user.getHostSpaces());

        // if the user is also a host in the space first unpromote him
        if (userIsHostInSpace) {
            var spaceHost = spaceHostRepository.findSpaceHostBySpaceIsAndHostIs(space, user);

            user.removeHostSpace(spaceHost);
            space.removeSpaceHost(spaceHost);

            userRepository.save(user);
            space = spaceRepository.save(space);
            spaceHostRepository.delete(spaceHost);
        }
        // then kick him as a normal user
        return removeNormalSpaceMember(space, user);
    }

    public Space removeSpaceMember(String spaceId, String memberId) {
        var space = this.getSpaceById(spaceId);
        var remover = userService.getContextUserIfExistsElseCreate();
        var toBeKicked = userService.getUserById(memberId);
        // Either the user wants to be kicked (when he wants to delete the space for himself)
        Space updatedSpace = null;
        if(toBeKicked.getId().equals(remover.getId()))
            updatedSpace = removeUserTriggeredByHimself(toBeKicked, space);
        else
        // Or the remover and the toBeKicked is not the same user
            updatedSpace =  removeUserTriggeredBySomeoneElse(remover, toBeKicked, space);
        // check member and host count
        checkSpaceMemberAndHostCount(space);
        return updatedSpace;
    }

    /***
     * Checks if the space has at least one member and one host. If the space does not have one host, a random user is
     * promoted to host. If the space does not have one member, the space is deleted.
     * @param space that should be checked
     * @return updated space
     */
    private Space checkSpaceMemberAndHostCount(Space space){
        if(space.getSpaceHosts().isEmpty()){
        // Promote random user to host if a user is left
            if (!space.getSpaceMembers().isEmpty()){
                // get a random member of the space which cannot be a host yet
                var randomSpaceMember = space.getSpaceMembers().iterator().next().getMember();
                var spaceHost = new SpaceHost(randomSpaceMember, space);

                randomSpaceMember.addHostSpace(spaceHost);
                space.addSpaceHost(spaceHost);
                userRepository.save(randomSpaceMember);
                space = spaceRepository.save(space);
                spaceHostRepository.save(spaceHost);
            }
        }
        if(space.getSpaceMembers().isEmpty()){
            spaceRepository.delete(space);
        }
        return space;
    }

    public Space addSpaceHost(String spaceId, String hostId) {
        var space = this.getSpaceById(spaceId);
        var invitor = userService.getContextUserIfExistsElseCreate();

        var host = userService.getUserById(hostId);

        boolean userIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), invitor.getHostSpaces());

        if (userIsNotHostInSpace)
            throw new AccessDeniedException("Not host of space");

        boolean inviteeNotYetMember = Collections.disjoint(space.getSpaceHosts(), host.getHostSpaces());

        if (inviteeNotYetMember) {
            var spaceHost = new SpaceHost(host, space);
            host.addHostSpace(spaceHost);
            space.addSpaceHost(spaceHost);

            // order matters here!
            userRepository.save(host);
            space = spaceRepository.save(space);
            spaceHostRepository.save(spaceHost);

            return space;
        }

        return space;
    }

    public SpaceHost promoteMemberToHost(String spaceId, String memberId) {
        // already verified: user is member in space
        // already verified: user is not already host in space
        var space = getSpaceById(spaceId);
        var member = userService.getUserById(memberId);
        var promoter = userService.getContextUserIfExistsElseCreate();

        boolean userIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), promoter.getHostSpaces());

        if (userIsNotHostInSpace)
            throw new AccessDeniedException("Not host of space");

        var spaceMember = member.getMemberSpaces()
                .stream()
                .filter(spaceMem -> spaceMem.getSpace().getId().equals(spaceId))
                .findFirst();

        if (spaceMember.isPresent()) {
            member.removeMemberSpace(spaceMember.get());
            space.removeSpaceMember(spaceMember.get());

            var spaceHost = new SpaceHost(member, space);
            member.addHostSpace(spaceHost);
            space.addSpaceHost(spaceHost);

            // order matters here!
            userRepository.save(member);
            spaceRepository.save(space);
            spaceHost = spaceHostRepository.save(spaceHost);
            spaceMemberRepository.delete(spaceMember.get());

            return spaceHost;
        } else {
            throw new EntityNotFoundException("Space Membership of user not found");
        }
    }

    public Space removeSpaceHost(String spaceId, String hostId) {
        var space = this.getSpaceById(spaceId);
        var remover = userService.getContextUserIfExistsElseCreate();
        var host = userService.getUserById(hostId);

        boolean userIsNotHostInSpace = Collections.disjoint(space.getSpaceHosts(), remover.getHostSpaces());

        if (userIsNotHostInSpace)
            throw new AccessDeniedException("Not host of space");

        var spaceHost = spaceHostRepository.findSpaceHostBySpaceIsAndHostIs(space, host);

        host.removeHostSpace(spaceHost);
        space.removeSpaceHost(spaceHost);

        userRepository.save(host);
        space = spaceRepository.save(space);
        spaceHostRepository.delete(spaceHost);

        // check the host count for this space
        checkSpaceMemberAndHostCount(space);
        return space;
    }

    public Boolean canCurrentUserJoinSpace(String spaceId) {
        var space = this.getSpaceById(spaceId);

        if (space.isPublic())
            return true;

        var currentUser = userService.getContextUserIfExistsElseCreate();
        return space.getAllUsers().contains(currentUser);
    }

    public Boolean isCurrentUserHost(String spaceId){
        var space = this.getSpaceById(spaceId);
        if (space.isPublic()) return false;
        var currentUser = userService.getContextUserIfExistsElseCreate();
        return !Collections.disjoint(space.getSpaceHosts(), currentUser.getHostSpaces());
    }
}
