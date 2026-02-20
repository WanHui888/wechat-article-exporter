export interface ProfileGetMsgResponse {
  ret: number;
  errmsg: string;
  can_msg_continue: number;
  msg_count: number;
  next_offset: number;
  real_type: number;
  use_video_tab: number;
  video_count: number;
  general_msg_list: string;
}

export interface app_msg_item {
  audio_fileid: number;
  author: string;
  content: string;
  content_url: string;
  copyright_stat: number;
  cover: string;
  del_flag: number;
  digest: string;
  duration: number;
  fileid: number;
  item_show_type: number;
  malicious_content_type: number;
  malicious_title_reason_id: number;
  play_url: string;
  source_url: string;
  title: string;
}

export interface ProfileGetMsg_app_msg_ext_info extends app_msg_item {
  subtype: number;
  is_multi: number;
  multi_app_msg_item_list: app_msg_item[];
}

export interface ProfileGetMsg_comm_msg_info {
  content: string;
  datetime: number;
  fakeid: string;
  id: number;
  status: number;
  type: number;
}

export interface ParsedProfileGetMsg {
  app_msg_ext_info: ProfileGetMsg_app_msg_ext_info;
  comm_msg_info: ProfileGetMsg_comm_msg_info;
}
