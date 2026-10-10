import GitHubConnection from "../../../lib/components/GitHubConnection";

export default function RenderingPage() {

  return (
    <div className="relative size-full">
      <div className="size-full flex justify-center items-center p-10 text-center">
        <span>Rendering Page. This Page Group contains Experiences for Variations of Renders. *This Page is a Work in Progress</span>
      </div>
      <GitHubConnection
        url="https://github.com/Swasbuckler/Creative-Coding/tree/main/src/pages/rendering/home"
        position="BOTTOM_RIGHT"
        className="text-gray-400 hover:text-gray-200 hover:scale-110"
      />
    </div>
  );
}