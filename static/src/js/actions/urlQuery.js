import { replace, push } from 'connected-react-router'
import { parse } from 'qs'

import { isPath } from '../util/isPath'
import { decodeUrlParams } from '../util/url/url'
import actions from './index'
import ProjectRequest from '../util/request/projectRequest'
import { RESTORE_FROM_URL } from '../constants/actionTypes'

const restoreFromUrl = payload => ({
  type: RESTORE_FROM_URL,
  payload
})

export const updateStore = ({
  collections,
  cmrFacets,
  featureFacets,
  focusedCollection,
  focusedGranule,
  map,
  project,
  query,
  shapefile,
  timeline
}) => (dispatch, getState) => {
  const { router } = getState()
  const { location } = router
  const { pathname, search } = location

  // Prevent loading from the url on these paths. The saved projects page needs to be handled
  // a little differently because it shares the base url with the projects page.
  const pathsToSkip = [/^\/downloads/]
  const isSavedProjectsPage = isPath(pathname, '/projects') && search === ''

  const loadFromUrl = (!isPath(pathname, pathsToSkip) && !isSavedProjectsPage)

  if (loadFromUrl) {
    dispatch(restoreFromUrl({
      collections,
      cmrFacets,
      featureFacets,
      focusedCollection,
      focusedGranule,
      map,
      project,
      query,
      shapefile,
      timeline
    }))

    dispatch(actions.getCollections())
    dispatch(actions.getFocusedCollection())
    dispatch(actions.getProjectCollections())
    dispatch(actions.getGranules())
    dispatch(actions.getTimeline())
  }
}

export const changePath = (path = '') => (dispatch) => {
  const queryString = path.split('?')[1]

  // if query string is a projectId, call getProject
  if (queryString && queryString.indexOf('projectId=') === 0) {
    const requestObject = new ProjectRequest()

    const { projectId } = parse(queryString)

    const projectResponse = requestObject.fetch(projectId)
      .then((response) => {
        const { data } = response
        const {
          name,
          path: projectPath
        } = data
        const projectQueryString = projectPath.split('?')[1]
        // save name and path into store, and projectId?
        dispatch(actions.updateSavedProject({
          path: projectPath,
          name,
          projectId
        }))
        dispatch(actions.updateStore(decodeUrlParams(projectQueryString)))
      })
      .catch((error) => {
        dispatch(actions.handleError({
          error,
          action: 'changePath',
          resource: 'project',
          verb: 'updating'
        }))
      })

    return projectResponse
  }

  dispatch(actions.updateStore(decodeUrlParams(queryString)))
  return null
}


const updateUrl = ({ options, oldPathname, newPathname }) => (dispatch) => {
  // Only replace if the pathname stays the same as the current pathname.
  // Push if the pathname is different
  if (oldPathname === newPathname) {
    dispatch(replace(options))
  } else {
    dispatch(push(options))
  }
}

/**
 * Push a new url state to the store.
 * @param {String|Object} options - Pushes the string or an object containing 'pathname' and 'search' keys
 * as the new url. When passing an object, if only one key is passed, only the corresponding piece of the
 * url will be changed.
 *
 * @example
 * // Given the original url '/a-old-url/?some-param=false', changes url to '/a-new-url/?some-param=true'
 * changeUrl('/a-new-url/?some-param=true')
 *
 * // Given the original url '/a-old-url/?some-param=false', changes url to '/a-new-url/?some-param=false'
 * changeUrl({ pathname: '/a-new-url' })
 */
export const changeUrl = options => (dispatch, getState) => {
  const {
    authToken,
    router,
    savedProject
  } = getState()

  let newOptions = options
  const { location } = router
  const { pathname: oldPathname } = location

  let newPathname
  if (typeof options === 'string') {
    [newPathname] = options.split('?')

    const { projectId, name, path } = savedProject
    if (projectId || options.length > 2000) {
      if (path !== newOptions) {
        const requestObject = new ProjectRequest()

        const projectResponse = requestObject.save({
          authToken,
          name,
          path: newOptions,
          projectId
        })
          .then((response) => {
            const { data } = response
            const {
              project_id: newProjectId,
              path: projectPath
            } = data

            newOptions = `${projectPath.split('?')[0]}?projectId=${newProjectId}`

            if (projectId !== newProjectId) {
              dispatch(replace(newOptions))
            }

            dispatch(actions.updateSavedProject({
              path: projectPath,
              name,
              projectId: newProjectId
            }))
          })
          .catch((error) => {
            dispatch(actions.handleError({
              error,
              action: 'changeUrl',
              resource: 'project',
              verb: 'updating'
            }))
          })

        return projectResponse
      }
    } else {
      dispatch(updateUrl({
        options: newOptions,
        oldPathname,
        newPathname
      }))
    }
  } else {
    ({ pathname: newPathname } = options)

    dispatch(updateUrl({
      options: newOptions,
      oldPathname,
      newPathname
    }))
  }
  return null
}