export function isPriorityArticle(article) {
    return article.priority === true || article.category === "Thông báo ưu tiên";
}
