import React, { Component } from 'react'

import DataLayerApolloWrapper from './components/DataLayerApolloWrapper'

import { processSearchContextProps } from './helpers/searchHelpers'
import searchQuery from './queries/searchQuery.gql'
import { Query } from 'react-apollo'

const DEFAULT_PAGE = 1
const DEFAULT_MAX_ITEMS_PER_PAGE = 1

class ProductSearchContextProvider extends Component {
  state = {
    variables: {
      maxItemsPerPage: DEFAULT_MAX_ITEMS_PER_PAGE,
    },
    /* Will be loading by default. The container will wait until the real data arrives */
    loading: true,
  }

  getData = searchQuery => {
    if (!searchQuery) {
      return null
    }

    const { products } = searchQuery

    const category = this.props.params.category

    return [
      {
        ecommerce: {
          impressions: products.map((product, index) => ({
            id: product.productId,
            name: product.productName,
            list: 'Search Results',
            brand: product.brand,
            category: searchQuery.facets.CategoriesTrees[index]
              ? searchQuery.facets.CategoriesTrees[index].Name
              : category,
            position: index + 1,
          })),
        },
      },
      {
        accountName: global.__RUNTIME__.account,
        pageCategory: category,
        pageDepartment: this.props.params.department,
        pageFacets: [],
        pageTitle: document.title,
        pageUrl: window.location.href,
      },
    ]
  }

  handleContextVariables = variables => {
    this.setState({
      variables,
      loading: false,
    })
  }

  render() {
    const props = processSearchContextProps(
      this.props,
      this.state,
      DEFAULT_PAGE
    )

    const { params, map, rest, orderBy, from, to } = props

    return (
      <Query
        query={searchQuery}
        variables={{
          query: Object.values(params)
            .filter(s => s.length > 0)
            .join('/'),
          map,
          rest,
          orderBy,
          from,
          to,
        }}
        notifyOnNetworkStatusChange
      >
        {searchQueryProps => (
          <DataLayerApolloWrapper
            getData={() =>
              this.getData({
                ...searchQueryProps.data.search,
              })
            }
            loading={this.state.loading || searchQueryProps.loading}
          >
            {React.cloneElement(this.props.children, {
              loading: this.state.loading,
              setContextVariables: this.handleContextVariables,
              ...props,
              searchQuery: {
                ...searchQueryProps,
                ...searchQueryProps.data.search,
              },
            })}
          </DataLayerApolloWrapper>
        )}
      </Query>
    )
  }
}

export default ProductSearchContextProvider
