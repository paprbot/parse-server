/**
 * Created by shawk on 5/24/2019.
 */
let simplifyUserMentions = require('././_User/simplifyUserMentions');


function simplifyPostQuestionMessage (PostQuestionMessage) {

    let user = PostQuestionMessage.get("user");

    user = simplifyUserMentions(user);

    let postQuestionMessage = PostQuestionMessage.toJSON();
    if (postQuestionMessage.post) {delete PostQuestionMessage.post;}
    if (postQuestionMessage.workspace) {delete PostQuestionMessage.workspace;}
    if (postQuestionMessage.channel) {delete PostQuestionMessage.channel;}
    if (postQuestionMessage.archive) {delete PostQuestionMessage.archive;}
    if (postQuestionMessage.type) {delete PostQuestionMessage.type;}
    if (postQuestionMessage.mediaType) {delete PostQuestionMessage.mediaType;}
    if (postQuestionMessage.video) {delete PostQuestionMessage.video;}
    if (postQuestionMessage.image) {delete PostQuestionMessage.image;}
    if (postQuestionMessage.replyMessage) {delete PostQuestionMessage.replyMessage;}
    if (postQuestionMessage.user) {

        delete postQuestionMessage.user;
        postQuestionMessage['user'] = user;

    }



    return postQuestionMessage;
}

module.exports = simplifyPostQuestionMessage;


