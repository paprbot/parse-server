/**
 * Created by shawk on 5/24/2019.
 */
/**
 * Created by shawk on 5/10/2019.
 */


function simplifyPostChatMessage (PostChatMessage) {

    let postChatMessage = PostChatMessage.toJSON();
    if (postChatMessage.image) {delete postChatMessage.image;}
    if (postChatMessage.video) {delete postChatMessage.video;}
    if (postChatMessage.post) {delete postChatMessage.post;}
    if (postChatMessage.workspace) {delete postChatMessage.workspace;}
    if (postChatMessage.channel) {delete postChatMessage.channel;}
    if (postChatMessage.likedCount) {delete postChatMessage.likedCount;}
    if (postChatMessage.replyMessage) {delete postChatMessage.replyMessage;}
    if (postChatMessage.archive) {delete postChatMessage.archive;}


    return postChatMessage;
}

module.exports = simplifyPostChatMessage;
