import React, { useEffect, useRef, useState } from 'react';
import { FloatingButton } from '../../components/container/floating-button';
import { RightMenus } from '../../components/header/right-menus';
import List from '../../components/list';
import { eSubscribeEvent, eUnSubscribeEvent } from '../../services/event-manager';
import Navigation, { NavigationProps, NotesScreenParams } from '../../services/navigation';
import SearchService from '../../services/search';
import useNavigationStore, { HeaderRightButton } from '../../stores/use-navigation-store';
import { useNoteStore } from '../../stores/use-notes-store';
import { useNavigationFocus } from '../../utils/hooks/use-navigation-focus';
import { NoteType } from '../../utils/types';
import {
  getAlias,
  isSynced,
  openEditor,
  openMonographsWebpage,
  setOnFirstSave,
  toCamelCase
} from './common';

export const WARNING_DATA = {
  title: 'Some notes in this topic are not synced'
};

export const PLACEHOLDER_DATA = {
  heading: 'Your notes',
  paragraph: 'You have not added any notes yet.',
  button: 'Add your first Note',
  action: openEditor,
  loading: 'Loading your notes.'
};

export const MONOGRAPH_PLACEHOLDER_DATA = {
  heading: 'Your monographs',
  paragraph: 'You have not published any notes as monographs yet.',
  button: 'Learn more about monographs',
  action: openMonographsWebpage,
  loading: 'Loading published notes.',
  type: 'monographs',
  buttonIcon: 'information-outline'
};

export interface RouteProps<T extends string> extends NavigationProps<T> {
  get: (id: string, grouped?: boolean) => NoteType[];
  placeholderData: any;
  onPressFloatingButton: () => void;
  focusControl?: boolean;
  canGoBack?: boolean;
  rightButtons?: (params: NotesScreenParams) => HeaderRightButton[];
}

const NotesPage = ({
  route,
  navigation,
  get,
  placeholderData,
  onPressFloatingButton,
  focusControl,
  canGoBack,
  rightButtons
}: RouteProps<'NotesPage' | 'TaggedNotes' | 'Monographs' | 'ColoredNotes' | 'TopicNotes'>) => {
  const [notes, setNotes] = useState<NoteType[]>(get(route.params?.item?.id));
  const params = useRef<NotesScreenParams>(route?.params);
  const [warning, setWarning] = useState(!isSynced(params.current));
  const loading = useNoteStore(state => state.loading);
  const alias = getAlias(params.current);
  const isMonograph = route.name === 'Monographs';

  const isFocused = useNavigationFocus(navigation, {
    onFocus: prev => {
      Navigation.routeNeedsUpdate(route.name, onRequestUpdate);
      syncWithNavigation();
      if (focusControl) return !prev;
      return false;
    },
    onBlur: () => {
      setOnFirstSave(null);
      return false;
    },
    focusOnInit: !focusControl
  });

  const syncWithNavigation = () => {
    const { item, title } = params.current;
    useNavigationStore.getState().update(
      {
        name: route.name,
        title: title,
        id: item?.id,
        type: 'notes'
      },
      params.current.canGoBack,
      rightButtons && rightButtons(params.current)
    );
    SearchService.prepareSearch = prepareSearch;
    RightMenus.floatingButtonAction = onPressFloatingButton;

    !isMonograph &&
      setOnFirstSave({
        type: item.type,
        id: item.id,
        color: item.title,
        //@ts-ignore
        notebook: item.notebookId
      });
  };

  const onRequestUpdate = (data?: NotesScreenParams) => {
    if (data) params.current = data;
    params.current.title = params.current.title || params.current.item.title;
    const { item } = params.current;
    try {
      let notes = get(item.id) as NoteType[];
      if ((item.type === 'tag' || item.type === 'color') && (!notes || notes.length === 0)) {
        return Navigation.goBack();
      }
      if (item.type === 'topic') setWarning(isSynced(params.current));
      setNotes(notes);
      syncWithNavigation();
    } catch (e) {}
  };

  useEffect(() => {
    eSubscribeEvent(route.name, onRequestUpdate);
    return () => {
      eUnSubscribeEvent(route.name, onRequestUpdate);
    };
  }, []);

  const prepareSearch = () => {
    const { item } = params.current;
    SearchService.update({
      placeholder: `Search in ${alias}`,
      type: 'notes',
      title: item.type === 'tag' ? '#' + alias : toCamelCase(item.title),
      get: () => {
        return get(item.id, false);
      }
    });
  };

  return (
    <>
      <List
        listData={notes}
        warning={warning ? WARNING_DATA : null}
        type="notes"
        refreshCallback={onRequestUpdate}
        loading={loading || !isFocused}
        screen="Notes"
        headerProps={{
          heading: params.current.title,
          color:
            params.current?.item?.type === 'color' ? params.current?.item.title.toLowerCase() : null
        }}
        placeholderData={placeholderData}
      />

      {notes?.length > 0 || isFocused ? (
        <FloatingButton title="Create a note" onPress={onPressFloatingButton} />
      ) : null}
    </>
  );
};

export default NotesPage;
