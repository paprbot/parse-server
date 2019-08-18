/**
 * Created by shawk on 5/10/2019.
 */

let simplifyUserMentions = require('../_User/simplifyUserMentions');
let simplifyWorkspace = require('../Workspace/simplifyWorkspace');
let simplifyChannel = require('../Channel/simplifyChannel');


function simplifyPost (Post) {

    let user = Post.get("user");
    let workspace = Post.get("workspace");
    let channel = Post.get("channel");

    user = simplifyUserMentions(user);
    workspace = simplifyWorkspace(workspace);
    channel = simplifyChannel(channel);

    //console.log("simplifyUserMentions User: " + JSON.stringify(user));

    Post.set("user", user);
    Post.set("workspace", workspace);
    Post.set("channel", channel);

    let post = Post.toJSON();

    if (post.chatMessageCount) {delete post.chatMessageCount;}
    if (post.chatMessageUnReadCount) {delete post.chatMessageUnReadCount;}
    if (post.postSocial) {delete post.postSocial;}


    return post;
}

module.exports = simplifyPost;

