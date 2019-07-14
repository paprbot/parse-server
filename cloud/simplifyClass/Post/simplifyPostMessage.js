

function simplifyPostMessage (PostMessage) {

    let postMessage = PostMessage.toJSON();
    if (postMessage.user.createdAt) {delete postMessage.user.createdAt;}
    if (postMessage.user.updatedAt) {delete postMessage.user.updatedAt;}
    if (postMessage.user.mySkills) {delete postMessage.user.mySkills;}
    if (postMessage.user.skillsToLearn) {delete postMessage.user.skillsToLearn;}
    if (postMessage.user.roles) {delete postMessage.user.roles;}

    return postMessage;
}

module.exports = simplifyPostMessage;
