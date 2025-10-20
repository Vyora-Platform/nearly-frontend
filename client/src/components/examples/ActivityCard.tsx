import ActivityCard from '../ActivityCard'

export default function ActivityCardExample() {
  return (
    <ActivityCard
      id="1"
      author={{
        name: "Rahul Kanpur",
        username: "@rahul_kanpur",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
      }}
      title="Going to watch Jawan at PVR Mall"
      description="Excited to announce a movie meetup for the new Shah Rukh Khan movie, 'Jawan'! Let's catch the first day first show together. It's going to be an amazing experience watching it with fellow fans. Anyone who's a fan of SRK is welcome to join!"
      imageUrl="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"
      location="PVR Mall, Kanpur, Uttar Pradesh"
      startDate="Tomorrow, 7:00 PM - 10:00 PM"
      cost="Paid Entry"
      category="Movies"
      likesCount={23}
      commentsCount={5}
      participantsCount={6}
      maxParticipants={10}
      timeAgo="2h ago"
    />
  )
}
