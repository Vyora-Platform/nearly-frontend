import EventCard from '../EventCard'

export default function EventCardExample() {
  return (
    <div className="p-4 max-w-md">
      <EventCard
        id="1"
        title="TechSparks 2024"
        imageUrl="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"
        host={{
          name: "TechHub",
          username: "@techub",
          avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TH"
        }}
        date="Fri, 15 Dec • 10:00 AM"
        location="Bangalore International Centre"
        attendeesCount={125}
        entryType="FREE"
        categories={["TECH", "STARTUP"]}
      />
    </div>
  )
}
