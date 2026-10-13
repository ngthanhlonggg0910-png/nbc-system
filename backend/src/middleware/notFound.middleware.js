export function notFoundHandler(req, res) {
    return res.status(404).json({
        success: false,
        message: "API không tồn tại",
    });
}