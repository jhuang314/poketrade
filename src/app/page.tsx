import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">PokéTrade Matchmaker</h1>
      <p className="mt-4 text-lg text-gray-600">
        Find your next trade partner.
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
