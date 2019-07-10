/**
 * Created by shawk on 7/10/2019.
 */


function selectPostChatMessage () {

    let chatMessageFieldArray = [];

    chatMessageFieldArray.push("seenByWorkspaceAdmins");
    chatMessageFieldArray.push("message");
    chatMessageFieldArray.push("likedCount");

    return chatMessageFieldArray;
}

module.exports = selectPostChatMessage;
