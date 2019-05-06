#Milee Singh Ashawad
#including libraries
needs(httr)
needs(dplyr)

#receiving the dataframe which is send by the r-script from node JS and at the back end it is converted into dataframe
frame<-input[[1]]$df
saveRDS(frame, file="frames.rds")

#preprocessing
#Likes
likes_count<-sum(frame$likes$count)

#preprocessing of the data
#Filtering done on Comments and Faces
#Comments and applying filtering and including only text
comments_count<-sum(frame$comments$count)
comments<-frame$commentstext
#Filtering and getting comments ony which are text and not including others
comments<-lapply(comments, function(x){
  if("text" %in% colnames(x))
  {
    return(x['text'])
  }
});
#Dealing with the null values and removing that data
d_comment<-list()
for(i in seq(comments)){
  d_comment[i]<-comments[[i]]
}
d_comment<-d_comment[!unlist(lapply(d_comment, is.null))]
comments_frame <- dplyr::bind_rows(comments)

#preprocessing on faces and removing the null data
#Faces and filtering to take only the face attributes which are age,gender and smile
faces<-lapply(frame$faces, function(x){
  if("faceAttributes" %in% colnames(x))
  {
    return(x['faceAttributes'])
  }
});d<-list()
for(i in seq(faces)){
  d[i]<-faces[[i]]
}
#removinf the null values from the dataframe 
d<-d[!unlist(lapply(d, is.null))]
faces_frame <- dplyr::bind_rows(d)

#calculating the average of the smile
smiles<-sum(faces_frame$smile)/nrow(faces_frame)

#calculating count of the male
male_count<-nrow(faces_frame[faces_frame$gender=='male',])

#calculating count of the female
female_count<-nrow(faces_frame[faces_frame$gender=='female',])

ages<-faces_frame$age

#Sentiment Analysis
comments_text<-data.frame(comments_frame$text)
response <- POST(
url = "http://sentiment.vivekn.com/api/batch/", 
body = toJSON(comments_text[, 1], auto_unbox = TRUE),
add_headers("Content-Type" = "application/json", "Accept" = "application/json"))
sentiments<- fromJSON(content(response, "text",encoding="UTF-8"))
final_sentiment <- cbind(comments_text, sentiments)
specify_decimal <- function(x, k) format(round(x, k), nsmall=k)
sentiment_positive<-(nrow(final_sentiment[final_sentiment$result=="Positive",])/nrow(final_sentiment[final_sentiment$result!="Neutral",]))*100
sentiment_negative<-(nrow(final_sentiment[final_sentiment$result=="Negative",])/nrow(final_sentiment[final_sentiment$result!="Neutral",]))*100
sentiment_positive<-specify_decimal(sentiment_positive,2)
sentiment_negative<-specify_decimal(sentiment_negative,2)

#Creating final df including likes,comments,smiles,male,female,age
final_frame <- data.frame(matrix(ncol = 8, nrow = 1))
nam <- c("Likes", "Comments", "Smiles","Male","Female","Age","Positive","Negative")
colnames(final_frame)<-nam
final_frame$Likes<-likes_count
final_frame$Comments<-comments_count
final_frame$Smiles<-smiles
final_frame$Male<-male_count
final_frame$Female<-female_count
final_frame$Age<-list(ages)
final_frame$Positive<-sentiment_positive
final_frame$Negative<-sentiment_negative
#Output List for JSON Output which is returned to node js
output<-list()
output[[1]]<-final_frame
#here also removing the neutral response which does not make any sense in analysis
output[[2]]<-final_sentiment[final_sentiment$result!="Neutral",]
output[[3]]<-faces_frame
output
