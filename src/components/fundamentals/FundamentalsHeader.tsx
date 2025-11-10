import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function FundamentalsHeader() {
  const { symbol = '' } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // When user changes the ticker from the global header in your app,
  // call navigate(`/stocks/${NEW}/` + (pathname.endsWith('/fundamentals') ? 'fundamentals' : ''))

  return (
    <div className="flex items-baseline justify-between py-2">
      <h1 className="text-xl font-semibold text-white">
        Fundamentals <span className="text-zinc-400">· {symbol}</span>
      </h1>
    </div>
  );
}
