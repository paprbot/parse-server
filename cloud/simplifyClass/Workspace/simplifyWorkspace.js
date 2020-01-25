/**
 * Created by shawk on 8/18/2019.
 */


function simplifyWorkspace (Workspace) {


    let workspace = Workspace.toJSON();

    if (workspace.experts) {delete workspace.experts;}
    if (workspace.user) {delete workspace.user;}
    if (workspace.nameWorkspaceID) {delete workspace.nameWorkspaceID;}
    if (workspace.isNew === true || workspace.isNew ===  false) {delete workspace.isNew;}
    if (workspace.postCount) {delete workspace.postCount;}
    //if (workspace.memberCount) {delete workspace.memberCount;}
    //if (workspace.followerCount) {delete workspace.followerCount;}
    if (workspace.ACL) {delete workspace.ACL;}
    //if (workspace.description) {delete workspace.description;}
    if (workspace.channelCount) {delete workspace.channelCount;}
    if (workspace.isDirtySkills === true || workspace.isDirtySkills ===  false) {delete workspace.isDirtySkills;}
    if (workspace.isDirtyExperts === true || workspace.isDirtyExperts ===  false) {delete workspace.isDirtyExperts;}
    if (workspace.skills) {delete workspace.skills;}

    return workspace;
}

module.exports = simplifyWorkspace;
/**
 * Created by shawk on 8/18/2019.
 */
