/**
 * Created by shawk on 5/10/2019.
 */


function simplifyWorkspaceFollowersUserIndex (WorkspaceFollower) {

    let workspaceFollower = WorkspaceFollower.toJSON();

    if (workspaceFollower.isMemberRequestedByUser === true || workspaceFollower.isMemberRequestedByUser === false) {delete workspaceFollower.isMemberRequestedByUser;}
    if (workspaceFollower.isMemberRequestedByWorkspaceAdmin === true || workspaceFollower.isMemberRequestedByWorkspaceAdmin === false) {delete workspaceFollower.isMemberRequestedByWorkspaceAdmin;}
    if (workspaceFollower.isUnRead === true || workspaceFollower.isUnRead === false) {delete workspaceFollower.isUnRead;}
    if (workspaceFollower.isNotified === true || workspaceFollower.isNotified === false) {delete workspaceFollower.isNotified;}

    if (workspaceFollower.workspace) {delete workspaceFollower.workspace;}
    if (workspaceFollower.createdAt) {delete workspaceFollower.createdAt;}
    if (workspaceFollower.updatedAt) {delete workspaceFollower.updatedAt;}

    if (workspaceFollower.algoliaIndexID) {delete workspaceFollower.algoliaIndexID;}
    if (workspaceFollower.isSelectedChannelFollow) {delete workspaceFollower.isSelectedChannelFollow;}
    if (workspaceFollower.isNewWorkspace === false || workspaceFollower.isNewWorkspace === true) {delete workspaceFollower.isNewWorkspace;}

    return workspaceFollower;
}

module.exports = simplifyWorkspaceFollowersUserIndex;

