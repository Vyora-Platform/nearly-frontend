import GroupCard from '../GroupCard'

export default function GroupCardExample() {
  return (
    <div className="p-4 max-w-md">
      <GroupCard
        id="1"
        name="Kanpur Startups"
        imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400"
        category="Startups"
        membersCount={1200}
        groupType="Public"
      />
    </div>
  )
}
