const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    if (res.headersSent) {
      return next(err);
    }
  
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, details: err.errors });
    }
  
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
  
    res.status(500).json({ message: 'Internal Server Error' });
  };
  
  module.exports = errorHandler;
  