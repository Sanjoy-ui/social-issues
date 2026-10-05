import { useNavigate } from 'react-router-dom';

export default function Example() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center text-sm min-h-screen px-4">
            <p className="font-medium text-lg text-indigo-500">404 Error</p>
            <h2 className="md:text-6xl text-4xl font-semibold text-gray-800 mt-2 sm:mt-3 text-center">Page Not Found</h2>
            <p className="text-base mt-4 text-gray-500 text-center">Sorry, we couldn’t find the page you’re looking for.</p>
            <div className="flex items-center gap-4 mt-6">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="bg-indigo-500 hover:bg-indigo-600 px-7 py-2.5 text-white rounded active:scale-95 transition-all cursor-pointer font-medium"
                >
                    Go back home
                </button>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 px-7 py-2.5 active:scale-95 transition cursor-pointer text-gray-700 font-medium"
                >
                    Contact support
                    <svg className="group-hover:translate-x-0.5 mt-0.5 transition" width="15" height="11" viewBox="0 0 15 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5.5h13.092M8.949 1l5.143 4.5L8.949 10" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export { Example as NotFoundPage };