export enum ClientToServerPacketType {
  CLIENT_INIT_REQUESTED = "cir",
  CLIENT_MAP_LOADED = "cml",
  PLAYER_READY = "plr",
  PLAYER_UNREADY = "plur",
  SOLDIER_CREATE_REQUESTED = "slcrreq",
  SPAWN_POINT_REQUESTED = "spwnpntreq",
  SOLDIERS_DELETE_REQUESTED = "sldrdelrqstd",
  SOLDIER_MOVE_REQUESTED = "slmovreq",
  PLAYER_JOINED = "pljoin",
  SOLDIER_ATTACK_REQUESTED = "sldierattkreq",
  CLIENT_SENT_CHAT = "clientchat",
  SPAWN_POINT_SELECTED = "spwnpntslct",
  SOLDIER_SPAWN_REQUESTED = "unitspwnreq",
  CAPTURE_FLAG_CREATE_REQUESTED = "cptrflgrqst",
  CAPTURE_FLAG_DELETE_REQUESTED = "cptrflgdltrqst",
  
  PING_REQUESTED = "ping"
}
export enum ServerToClientPacketType {
  NEW_CHAT_MESSAGE = "newcm",
  SOLDIER_KILLED = "sk",
  GAME_STARTED = "gs",
  SOLDIER_CREATE_ACK = "sca",
  SOLDIER_SPAWN_SCHEDULED = "sspwnsch",
  PLAYER_SCORE_UPDATED = "plyrscoreupdated",
  SPAWN_POINT_ACK = "spnpntack",
  SPAWN_POINT_RJCT = "spnpntreject",
  GAME_STATE_SYNC = "gss",
  PLAYER_LEFT = "pl",
  PLAYER_INIT = "pi",
  PLAYER_LOST = "plyrlost",
  SOLDIER_ATTACK_ACK = "saa",
  SOLDIER_ATTACKED = "sh",
  PLAYER_RESOURCE_UPDATED = "pru",
  SOLDIER_POSITION_UPDATED = "spu",
  COUNTDOWN_TIME = "cdwn",
  SOLDIER_STATE_DEBUG = "debug_soldierState",
  
  SOLDIER_SPAWN_REQUEST_UPDATED = "spawn_request_updated",
  
  PONG_RESPONSE = "pong",
  GAME_OVER = "gameover"
}

export const PacketType = {
  ByClient: {
    ...ClientToServerPacketType,
  },
  ByServer: {
    ...ServerToClientPacketType,
  },
};
