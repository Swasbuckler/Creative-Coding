import { IconChevronRight, IconLayoutSidebarLeftExpandFilled, IconX } from "@tabler/icons-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { NavLink, Outlet, useMatch } from "react-router";
import type { NavLinkGroup } from "./lib/types";

const navLinkGroup: NavLinkGroup = {
  path: 'water',
  label: 'Water',
  children: [
    {
      path: 'water-caustic',
      label: 'Water Caustic (Based on Evanw)'
    },
    {
      path: 'ocean-waves',
      label: 'Ocean Waves'
    },
  ]
}

export default function Menu() {

  const [openNav, setOpenNav] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-gray-100 bg-gray-950">
      <div 
        className="absolute flex items-center transform transition-all duration-75 ease-in-out size-10 left-2 top-1/2 -translate-y-1/2 cursor-pointer z-10 text-gray-400 hover:text-gray-200 hover:*:rotate-360"
        onClick={() => setOpenNav(true)}
      >
        <IconLayoutSidebarLeftExpandFilled className="transform transition-all duration-250 ease-in-out size-7 stroke-1 stroke-gray-950" />
      </div>
      <div className={`absolute h-full transform transition-all duration-500 ease-in-out${openNav ? ' left-0' : ' -left-50'} z-50`}>
        <NavBar setOpenNav={setOpenNav} />
      </div>
      <div 
        className={`absolute size-full z-40 transform transition-all duration-500 ease-in-out hover:bg-black/40 ${openNav ? 'bg-black/25 pointer-events-auto cursor-pointer' : 'bg-transparent pointer-events-none'}`}
        onClick={() => setOpenNav(false)}
      ></div>
      <Outlet />
    </div>
  );
}

function NavBar({
  setOpenNav,
}: {
  setOpenNav: Dispatch<SetStateAction<boolean>>
}) {

  return (
    <div className="flex flex-col w-40 sm:w-50 transform transition-all h-full **:truncate **:text-sm bg-gray-900 border-r-2 border-gray-500 p-2">
      <div className="flex justify-between pb-1.25">
        <span className="font-lobster">Creative Coding {'{.}'}</span>
        <IconX 
          className="cursor-pointer size-6.25 transform transition-all duration-250 ease-in-out text-gray-500 hover:text-gray-200 hover:rotate-180" 
          onClick={() => setOpenNav(false)}
        />
      </div>
      <NavLink 
        className="hover:underline"
        to="/" 
        title="Home"
      >
        Home
      </NavLink>
      <DropDownNav
        navLinkGroup={navLinkGroup}
        index={0}
      />
    </div>
  );
}

function DropDownNav({
  navLinkGroup,
  index,
}: {
  navLinkGroup: NavLinkGroup,
  index: number,
}) {

  const [isDropDown, setIsDropDown] = useState(false);
  
  const isActive = useMatch(`/${navLinkGroup.path}/*`);

  useEffect(() => {

    setIsDropDown(!!isActive);

  }, [isActive]);

  return (
    <div className={`${navLinkGroup.className ? ` ${navLinkGroup.className}`: ''}`}>
      <NavLink 
        className="relative block cursor-pointer hover:underline"
        to={navLinkGroup.path}
        title={navLinkGroup.label}
      >
        <span>{navLinkGroup.label}</span>
        <IconChevronRight className={`absolute top-0 right-0 size-5 transform transition-all ease-in-out${isDropDown ? ' rotate-90' : ''}`} />
      </NavLink>
      <div className={`flex flex-col transform transition-[max-height] duration-500 ease-in-out overflow-hidden${isDropDown ? ' max-h-full': ' max-h-0 pointer-events-none'}`}>
        {navLinkGroup.children?.map((navLinkItem, idx) => {
          return navLinkItem.children ? 
            <DropDownNav
              navLinkGroup={{
                path: `${navLinkGroup.path}/${navLinkItem.path}`,
                label: navLinkItem.label,
                children: navLinkItem.children,
                className: navLinkItem.className
              }}
              index={index + 1}
            />
          : <NavLink
              key={idx}
              className={`${navLinkItem.className ? `${navLinkItem.className} hover:underline` : 'hover:underline'}`}
              to={`${navLinkGroup.path}/${navLinkItem.path}`}
              title={navLinkItem.label}
            >
              {navLinkItem.label}
            </NavLink>
        })}
      </div>
    </div>
  );
}