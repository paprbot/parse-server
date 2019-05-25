/**
 * Created by shawk on 5/24/2019.
 */


function simplifyPostQuestion (PostQuestion) {

    let postQuestion = PostQuestion.toJSON();
    if (postQuestion.workspace) {delete postQuestion.workspace;}
    if (postQuestion.channel) {delete postQuestion.channel;}
    if (postQuestion.archive) {delete postQuestion.archive;}
    if (postQuestion.type) {delete postQuestion.type;}
    if (postQuestion.mediaType) {delete postQuestion.mediaType;}
    if (postQuestion.post_File) {delete postQuestion.post_File;}
    if (postQuestion.postImage) {delete postQuestion.postImage;}
    if (postQuestion.replyMessage) {delete postQuestion.replyMessage;}
    if (postQuestion.transcript_file) {delete postQuestion.transcript_file;}
    if (postQuestion.privacy) {delete postQuestion.privacy;}
    if (postQuestion.PostSocial) {delete postQuestion.PostSocial;}
    if (postQuestion.topIntent) {delete postQuestion.topIntent;}
    if (postQuestion.youTubeVideoID) {delete postQuestion.youTubeVideoID;}
    if (postQuestion.questionAnswerEnabled) {delete postQuestion.questionAnswerEnabled;}
    if (postQuestion.chatEnabled) {delete postQuestion.chatEnabled;}
    if (postQuestion.PostSocialmatch) {delete postQuestion.PostSocialmatch;}
    if (postQuestion.isTranscriptShow) {delete postQuestion.isTranscriptShow;}
    if (postQuestion.postQuestions) {delete postQuestion.postQuestions;}
    if (postQuestion.postQuestionCount) {delete postQuestion.postQuestionCount;}
    if (postQuestion.chatMessageCount) {delete postQuestion.chatMessageCount;}
    if (postQuestion.chatMessageUnReadCount) {delete postQuestion.chatMessageUnReadCount;}

    return postQuestion;
}

module.exports = simplifyPostQuestion;

