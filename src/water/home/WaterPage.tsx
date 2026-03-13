import GitHubConnection from "../../lib/components/GitHubConnection";

export default function WaterPage() {

  return (
    <div className="relative size-full">
      <div className="size-full flex justify-center items-center p-10 text-center">
        <span>Water Page. This Page Group contains Renders and Experiences related to Water. *This Page is a Work in Progress</span>
      </div>
      <GitHubConnection
        url="https://github.com/"
        position="BOTTOM_RIGHT"
        size={8}
        className="text-gray-400 hover:text-gray-200 hover:scale-110"
      />
    </div>
  );
}