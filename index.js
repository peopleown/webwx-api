#!/usr/bin/env node
// 导入基本模块
var mailer = require("./libs/core/mail");
var wechatapi = require('./wechatapi');
var config = require('./libs/core/config');
var schedule = require('node-schedule');

//联系人列表
var MemberList =new Array();
var publicUsersList=new Array();
var specialUsersList = new Array();
var groupList =new Array();
var groupUsers={};
var SPECIALUSER = ["newsapp", "filehelper", "weibo", "qqmail",
            "fmessage", "tmessage", "qmessage", "qqsync",
            "floatbottle", "lbsapp", "shakeapp", "medianote",
            "qqfriend", "readerapp", "blogapp", "facebookapp",
            "masssendapp", "meishiapp", "feedsapp", "voip",
            "blogappweixin", "brandsessionholder", "weixin",
            "weixinreminder", "officialaccounts", "wxitil",
            "notification_messages", "wxid_novlwrv3lqwv11",
            "gh_22b87fa7cb3c", "userexperience_alarm"];

wechatapi.getUUID();
var time1=setInterval(test,1000);
function test(){
	if(config.retFlag){
			wechatapi.wxStatusNotify(function(data){
				var result=JSON.parse(data);
				if(result.BaseResponse.Ret==0){
				    if(config.isDebug){
				      console.log("开启微信状态通知成功...");
				    }
				    getContact();
				  }else{
				    if(config.isDebug){
				      console.log("开启微信状态通知失败...");
				    }
				}
			});
			clearTimeout(time1);
		}else{
		}
}

function getContact(){
	wechatapi.getContact(function(data){
		var result=JSON.parse(data);
	  	if(result.BaseResponse.Ret==0){
		    if(config.isDebug){
		      console.log("获取联系人列表成功...共"+result.MemberCount +'位联系人');
		    }
		    for(var i=0;i<result.MemberList.length;i++){
		    	var member=result.MemberList[i];
		    	if(member.VerifyFlag != 0){//公众号/服务号
		    		publicUsersList.push(member);
		    	}else if(SPECIALUSER.toString().indexOf(member.UserName) > -1){//特殊账号
		    		specialUsersList.push(member);

		    	}else if(member.UserName.substr(0,2)=='@@'){//群聊
		    		groupList.push(member);

		    	}else if(member.UserName==config.user.UserName){//自己

		    	}else{
		    		MemberList.push(member);
		    	}
		    }
		    if(groupList.length >0){
		    	//获取群成员
		    	var groupIds=new Array();
		    	for(var i=0;i<groupList.length;i++){
		    		groupIds.push(groupList[i].UserName);
		    	}
		    	if(groupIds.length>0){
		    		fetchGroupContacts(groupIds);
		    	}
		    }
		  }else{
		    if(config.isDebug){
		      console.log("获取联系人列表失败...");
		    }
		 }
		 listen();
	});
	
}

function listen(){
	if(flag){
		flag=false;
		count =1;
		synccheck();
	}
}

var flag=true;
var count=1;
 
function synccheck(){
	if(!flag){
		wechatapi.syncCheck(function(data){
			console.log('data:'+data);
			var check=data.match(/synccheck=(\S*)/)[1];
			var result=eval("("+check+")");
			var retCode =result.retcode;
			if(retCode==0){
				handle(result.selector);
				flag=true;
			}else if(retCode =='1101'){
				if(config.isDebug){
			    	console.log("微信登出...");
			    }
			    flag=false;
			}else if(retCode =='1102'){
				if(config.isDebug){
			    	console.log("手机端微信登出...");
			    }
			    flag=false;
			}else{
				count++;
				if(config.isDebug){
			    	console.log("微信监听失败...切换线路"+count);
			    }
			    config.wxHost.check_host=config.wxHost['check_host'+count];
			    console.log(config.wxHost.check_host);
			    if(count==6){
			    	count =1;
			    }
			    synccheck();
			    
			}
		});
	}else{

	}
}

function handle(selector){
	if(selector==2){
		//新消息
		wechatapi.webwxsync(function(data){
			var result=JSON.parse(data);
			handle_msg(result);
			
		});
		
	}else if(selector==7){
		//进入/离开聊天界面
		wechatapi.webwxsync(function(data){
			setTimeout(listen,5000);
		});
	}else if(selector==0){
		//正常
		setTimeout(listen,5000);
	}else if(selector==4){
		// 保存群聊到通讯录
        // 修改群名称
        // 新增或删除联系人
        // 群聊成员数目变化
       wechatapi.webwxsync(function(data){
        	var result=JSON.parse(data);
        	setTimeout(listen,5000);
			//handle_msg(result);
		});
        
	}
	
}

function handle_msg(result){
	var msgListCount = result.AddMsgList.length;
	if(msgListCount==0){
		return;
	}

	var AddMsgList = result.AddMsgList;
	for(var m in AddMsgList){
		var msgType = AddMsgList[m].MsgType;
		var msgId = AddMsgList[m].MsgId;
		var content = AddMsgList[m].Content;
		if(content.length>1){
			content=content.replace('&lt','<').replace('&gt', '>');
		}
		/*if(content.trim().length==0){
			return;
		}*/
		var fromUserName = AddMsgList[m].FromUserName;
		var toUserName = AddMsgList[m].ToUserName;

		if(msgType == 1){
			//文本消息
		}else if(msgType == 3){
			//图片消息
		}else if(msgType == 34){
			//语音消息
		}else if(msgType == 47){
			//动画表情
		}else if(msgType == 10000){
			//系统消息
		}else if(msgType == 10002){
			//撤回消息
		}else{
			continue;
		}
		console.log(result);
		if(wechatapi.getAccountType(fromUserName) == '群聊'){
			var username =content.match(/(\S*):/)[1];
			var user = getUserInfoGroup(fromUserName,username);
			if(msgType == 1){
				var msg=content.match(/<br\/>(\S*);/)[1];
				if(config.isDebug){
					console.log('收到群消息['+user.NickName+']:'+msg);
				}
				if(msg.substr(0,1).trim()=='@'){
					console.log("@的消息"+content);
				}
			}
		}else{
			var user =getUserInfo(fromUserName);
			var msg =content;
			if(config.isDebug){
				console.log('收到个人消息['+user.NickName+']:'+msg);
			}
		}
	}
	setTimeout(listen,5000);
}

function handle_mod(result){

}

function fetchGroupContacts(groupIds){
	wechatapi.getGroupList(groupIds,function(data){
		var result=JSON.parse(data);
	  	if(result.BaseResponse.Ret==0){
	  		var contactList =result.ContactList;
	  		for(var i=0;i<contactList.length;i++){
	  			var member_list=contactList[i];
	  			groupUsers[member_list.UserName] = member_list;
	  		}

	  	}else{
	  		if(config.isDebug){
	  			console.log('获取群成员失败...');
	  		}
	  	}
	});
}

//获取用户信息
function getUserInfo(name){
	if(name == config.user.UserName){
		return config.user;
	}

	for(var i=0;i<MemberList.length;i++){
		var member = MemberList[i];
		if(member.UserName == name){
			return member;
		}
	}
}

function getUserInfoGroup(groupId,name){
	if(name == config.user.UserName){
		return config.user;
	}
	var user=groupUsers[groupId];
	if(user!=undefined){
		for(var i=0;i<user.MemberList.length;i++){
		var member = user.MemberList[i];
		console.log(member);
		if(member.UserName == name){
			return member;
		}
	}

	}
	
}
