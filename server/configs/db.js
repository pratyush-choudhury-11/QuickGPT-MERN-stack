import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('Database connected'))
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'quickgpt',
            serverSelectionTimeoutMS: 5000,
        })
    } catch (error) {
        console.log('DB connection failed:', error.message)
        throw error
    }
}

export default connectDB;
