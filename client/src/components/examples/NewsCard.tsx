import NewsCard from '../NewsCard'

export default function NewsCardExample() {
  return (
    <div className="p-4 max-w-md">
      <NewsCard
        id="1"
        author={{
          name: "@localreporter",
          location: "Hauz Khas, Delhi",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=LR"
        }}
        headline="Road closed near IIT Gate"
        description="A brief summary of the news item about a temporary road closure affecting local traffic."
        imageUrl="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800"
        category="Local"
        trueVotes={210}
        fakeVotes={105}
        likesCount={120}
        commentsCount={88}
        timeAgo="5m ago"
      />
    </div>
  )
}
