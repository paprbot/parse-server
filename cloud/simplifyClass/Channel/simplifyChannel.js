/**
 * Created by shawk on 8/18/2019.
 */


function simplifyChannel (Channel) {


    let channel = Channel.toJSON();

    if (channel.experts) {delete channel.experts;}
    if (channel.user) {delete channel.user;}
    if (channel.nameWorkspaceID) {delete channel.nameWorkspaceID;}
    if (channel.isNew === true || channel.isNew ===  false) {delete channel.isNew;}
    if (channel.postCount) {delete channel.postCount;}
    if (channel.memberCount) {delete channel.memberCount;}
    if (channel.followerCount) {delete channel.followerCount;}
    if (channel.archive === true || channel.archive ===  false) {delete channel.archive;}
    if (channel.ACL) {delete channel.ACL;}


    return channel;
}

module.exports = simplifyChannel;
