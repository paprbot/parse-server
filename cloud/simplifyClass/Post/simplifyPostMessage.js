

function simplifyPostMessage (PostMessage) {

    let PostMessage = PostChatMessage.toJSON();
    if (PostMessage.user.createdAt) {delete PostMessage.user.createdAt;}
    if (PostMessage.user.updatedAt) {delete PostMessage.user.updatedAt;}
    if (PostMessage.user.mySkills) {delete PostMessage.user.mySkills;}
    if (PostMessage.user.skillsToLearn) {delete PostMessage.user.skillsToLearn;}
    if (PostMessage.user.roles) {delete PostMessage.user.roles;}

    return PostMessage;
}

module.exports = simplifyPostMessage;
