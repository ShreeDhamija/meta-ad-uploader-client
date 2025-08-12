// pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import NotFoundImage from '../assets/rocketpreview.webp';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
            <div className="bg-white rounded-xl shadow-md py-20 px-10 text-center max-w-lg w-full">
                <h1 className="text-6xl m-0 mb-5 text-gray-800">404</h1>

                <img
                    src={NotFoundImage}
                    alt="Page not found"
                    className="max-w-[200px] w-full h-auto my-5 mx-auto rounded-lg block"
                />

                <h2 className="my-5 text-gray-600 text-2xl">Page Not Found</h2>
                <p className="my-5 text-gray-500 leading-relaxed">
                    The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
                </p>
                <Link
                    to="/"
                    className="inline-block py-3 px-6 bg-blue-500 text-white no-underline rounded-[20px] mt-5 transition-all duration-200 ease-in-out font-medium hover:bg-blue-700 hover:-translate-y-px"
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
};

export default NotFound;