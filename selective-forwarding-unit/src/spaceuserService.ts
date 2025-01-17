import {Consumer, Transport, Worker} from "mediasoup/node/lib/types";
import {createAndConfigureWorker} from "./mediasoupWorker";
import { webRtcTransportOption} from "./config";
import {logger} from "./logger";
import {Socket} from "socket.io";
import {User} from "./model/User";
import {Space} from "./model/Space";

export function logInfo() {
  SPACE_MAP.forEach((value: Space, key: string)=>{
    logger.info('============ Space: ' + key + ' ============');
    logger.info('Space: ' + key + ' has ' + value.users.size + ' users');
    logger.info('ProducerTransports: ' + value.returnAllProducerTransports());
    logger.info('ConsumerTransports: ' + value.returnAllConsumerTransports());
    logger.info('Producers: ' + value.returnAllProducers());
    logger.info('Consumers: ' + value.returnAllConsumers());
    logger.info('==========================================');
  })
}

const SPACE_MAP = new Map<string, Space>();
export let WORKER: undefined | Worker = undefined;
createAndConfigureWorker().then(worker => {
    WORKER = worker;
});

export async function addUserToSpace(spaceName: string, socketId: string, globalId: string, socket: Socket){
    let space
    if (SPACE_MAP.has(spaceName)) {
      space = SPACE_MAP.get(spaceName)
    } else {
      space = new Space(spaceName)
      await space.createRouter()
      SPACE_MAP.set(spaceName, space)
    }
    const user = new User(socketId, globalId, spaceName, socket)
    space!.addUser(user)
    logger.info(`User ${socketId} added to space ${spaceName}`)
}

export function getRtpCapabilities(spaceName: string) {
  return SPACE_MAP.get(spaceName)!.router?.rtpCapabilities
}

export function handleDisconnect(spaceName: string, id: string) {
  const space: Space = SPACE_MAP.get(spaceName)!
  const user: User = space.users.get(id)!
  if(!space || !user) {
    logger.error(`User ${id} not found in space ${spaceName} and connection could not be closed`)
    return
  }else{
    user.closeAllConnections()
    space.handleDisconnectConnection(user)
    space.removeUser(user)
    logger.info(`User ${id} disconnected from space ${spaceName} and all its connection were closed`)
    logInfo()
    if(space.users.size === 0) {
      space.closeRouter()
      SPACE_MAP.delete(spaceName)
      logger.info(`Space ${spaceName} removed and router closed`)
    }
  }
}

export const createWebRtcTransportAndReturnParams = async (spaceName: string, isConsumer: boolean, socketId: string, senderId: string) => {
  const space: Space = SPACE_MAP.get(spaceName)!
  const user: User = space.users.get(socketId)!
  const router = space.router!

  if(!space || !user || !router) {
    throw new Error(`Space ${space}, user ${user} and router ${router} should be defined`)
  } else{
    // create new transport for the user
    let transport = await router.createWebRtcTransport(webRtcTransportOption)

    // add eventlistener to transport
    transport.on('dtlsstatechange', dtlsState => {
      if(dtlsState === 'closed') transport.close()
    });
    // add transport to the user
    if(isConsumer){
      SPACE_MAP.get(spaceName)!.users.get(socketId)!.addConsumerTransport(senderId, transport)
    } else{
      SPACE_MAP.get(spaceName)!.users.get(socketId)!.createProducerTransport(transport)
    }
    logger.info(`WebRtcTransport created for user ${socketId} with type ${isConsumer ? 'consumer' : 'producer'}`)
    return transport
  }
}

export const connectDtlsParameterToProducer = (spaceName: string, socketId: string, dtlsParameters: any)  => {
  SPACE_MAP.get(spaceName)!.users.get(socketId)!.connectDtlsParametersToProducer({dtlsParameters})
}

export const connectDtlsParameterToConsumer = (spaceName: string, socketId: string, dtlsParameters: any, id: string)  => {
  SPACE_MAP.get(spaceName)!.users.get(socketId)!.connectDtlsParametersToConsumer(dtlsParameters, id)
}

export const createProducer = async (spaceName: string, socketId: string, producerOptions: any) => {
  const space : Space = SPACE_MAP.get(spaceName)!
  const user : User = space.users.get(socketId)!
  const producerTransport : Transport | undefined = user.producerTransport
  if(!space || !user || !producerTransport){
    throw new Error(`Space ${space}, user ${user} and producerTransport ${producerTransport} should be defined`)
  } else{
    const producer = await producerTransport.produce({
      kind: producerOptions.kind,
      rtpParameters: producerOptions.rtpParameters,
    })
    // close  the producer when the transport is closed
    producer.on('transportclose', () => {
      logger.info(`Producer ${producer.id} closed for user ${socketId} with type ${producer.kind}`)
      producer.close()
    })
    // add the producer to the respective user
    user.addProducer(producer)

    // inform other users in the space that a new producer was created
    logger.info(`Producer created for user ${socketId}`)
    space.informUsersAboutNewProducer(socketId, producer.id, user.globalId)


    // return the params of the producer
    return [producer.id, space.hasMoreThanOneUser()]
  }
}

export const createConsumer = async (spaceName: string, socketId: string, {rtpCapabilities, producerId, consumerTransportId, senderSocketId}: any) => {
  const space : Space = SPACE_MAP.get(spaceName)!
  const user : User = space.users.get(socketId)!

  // if the router cannot consume the producer throw an error
  if(!space.router!.canConsume({producerId, rtpCapabilities})){
    return new Error('cannot consume')
  }

  const consumerTransport = user.getConsumerTransportWithId(consumerTransportId)!

  // create paused consumer
  const consumer = await consumerTransport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  })
  // add eventlistener to the consumer
  consumer.on('transportclose', () => {
    logger.info(`Transport: ${consumerTransport.id} for consumer: ${consumer.id} for user: ${socketId} closed. Will close consumer with type ${consumer.kind} consuming from user: ${senderSocketId}`)
    consumer.close()
  })
  consumer.on("producerclose", () => {
    logger.info(`Producer: ${producerId} for consumer: ${consumer.id} for user ${socketId} closed. Will close consumer with type ${consumer.kind} consuming from user: ${senderSocketId}`)
    consumer.close()
    consumerTransport.close()
  })
  // add consumer to the respective user
  user.addConsumer(consumer, senderSocketId)
  logger.info(`Consumer: ${consumer.id} with type ${consumer.kind} created for user ${socketId}. Consuming from user: ${senderSocketId}`)
  return consumer
}

export const resumeConsume = async (spaceName: string, socketId: string, consumerId: string, senderSocketId: string) => {
  const space: Space = SPACE_MAP.get(spaceName)!
  const user: User = space.users.get(socketId)!
  const consumer = user.getConsumerWithId(consumerId)!
  const sender: User = space.users.get(senderSocketId)!
  if (!space || !user || !consumer || !sender) {
    throw new Error(`Space ${space}, user ${user}, sender ${sender} and consumer ${consumer} should be defined`)
  } else {
    // based on the internal state the consumer should now be resumed or kept paused
    // the globalId should be used here
    sender.getMediaState(user.globalId, consumer.kind) ? await consumer.resume() : await consumer.pause()
    logger.info(`Consumer: ${consumer.id} with type ${consumer.kind} resumed?: ${sender.getMediaState(user.globalId, consumer.kind)}
     for user ${user.globalId}. Consuming from user: ${sender.globalId}`)
  }
}

export const getPeerProducerList = (spaceName: string, socketId: string) => {
  const space: Space = SPACE_MAP.get(spaceName)!
  const user: User = space.users.get(socketId)!
  if(!space || !user) {
    throw new Error(`Space ${space} and user ${user} should be defined`)
  }else{
    return space.getPeerProducerList(socketId)
  }
}

// update media for a user when either video or audio is not undefined
export function updateMediaForUser(spaceName: string, socketId: string, globalTargetId: string, video: boolean, audio: boolean) {
  const space: Space = SPACE_MAP.get(spaceName)!
  const sender: User = space.users.get(socketId)!
  // because of race conditions the target might not be defined yet
  const target: User = space.getUserByGlobalId(globalTargetId)!

  if(!space || !sender) {
    logger.warn(`Space ${space} or sender ${sender} are not yet defined`)
  }else{
    // first we change the internal state
    if(video != undefined){
      sender.updateMediaState(globalTargetId, "video", video)
    }
    if(audio != undefined){
      sender.updateMediaState(globalTargetId, "audio", audio)
    }
    // if the target is already defined we change the actual state
    if(target){
      target.updateMedia(socketId, video, audio)
    } else{
      logger.warn(`Target ${globalTargetId} is not yet defined but the state will be updated anyway`)
    }
  }
}

export function getGlobalUserIdWithSocketId(spaceName: string, socketId: string): string {
  const space: Space |undefined = SPACE_MAP.get(spaceName)
  const user: User | undefined = space!.users.get(socketId)
  if(!space || !user) {
    throw new Error(`Space ${space} and user ${user} should be defined`)
  }else{
    return user.globalId
  }
}


export function isSendingMedia(spaceName: string, id: string, globalTargetId: string, media: string) {
  const space: Space = SPACE_MAP.get(spaceName)!
  const sender: User = space.users.get(id)!
  const target: User = space.getUserByGlobalId(globalTargetId)!
  if(!(media === 'video') && !(media === 'audio')) {
    throw new Error(`media ${media} is not supported`)
  }
  if(!space || !sender || !target) {
    logger.warn(`Space ${space}, sender ${sender} or target ${target} are not yet defined`)
  }else{
    return target.isGettingMediaFrom(sender.id, media)
  }
}

