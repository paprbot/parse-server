/**
 * Created by shawk on 5/10/2019.
 */


function simplifyWorkspaceFollowersUserIndex (WorkspaceFollower) {

    let workspaceFollower = WorkspaceFollower.toJSON();
    if (workspaceFollower.archive === true || workspaceFollower.archive === false) {delete workspaceFollower.archive;}
    if (workspaceFollower.isMember === true || workspaceFollower.isMember === false) {delete workspaceFollower.isMember;}
    if (workspaceFollower.isFollower === true || workspaceFollower.isFollower === false) {delete workspaceFollower.isFollower;}
    if (workspaceFollower.isMemberRequestByUser === true || workspaceFollower.isMemberRequestByUser === false) {delete workspaceFollower.isMemberRequestByUser;}
    if (workspaceFollower.isMemberRequestedByWorkspaceAdmin === true || workspaceFollower.isMemberRequestByUser === false) {delete workspaceFollower.isMemberRequestedByWorkspaceAdmin;}
    if (workspaceFollower.isUnRead === true || workspaceFollower.isUnRead === false) {delete workspaceFollower.isUnRead;}
    if (workspaceFollower.isNotified === true || workspaceFollower.isNotified === false) {delete workspaceFollower.isNotified;}
    if (workspaceFollower.isSelected === true || workspaceFollower.isSelected === false) {delete workspaceFollower.isSelected;}

    if (workspaceFollower.user) {delete workspaceFollower.user;}
    if (workspaceFollower.createdAt) {delete workspaceFollower.createdAt;}
    if (workspaceFollower.updatedAt) {delete workspaceFollower.updatedAt;}
    if (workspaceFollower.notificationCount) {delete workspaceFollower.notificationCount;}
    if (workspaceFollower.algoliaIndexID) {delete workspaceFollower.algoliaIndexID;}
    if (workspaceFollower.isSelectedChannelFollow) {delete workspaceFollower.isSelectedChannelFollow;}

    workspaceFollower['index'] = 0;

    return workspaceFollower;
}

module.exports = simplifyWorkspaceFollowersUserIndex;

